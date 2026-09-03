import { ModelDefinitions, Models } from '../../src/models';
import { getLogSafeTechnicalDisplay, getTechnicalDisplay, technicalMessage } from '../../src/resolvers/utils';

// Local models rather than the shared test models, so that adding an entity here
// does not churn every generated-schema snapshot.
const modelDefinitions: ModelDefinitions = [
  {
    kind: 'entity',
    name: 'Post',
    displayField: 'title',
    fields: [{ name: 'title', type: 'String' }],
  },
  {
    kind: 'entity',
    name: 'Person',
    displayField: 'fullName',
    sensitiveDisplay: true,
    fields: [{ name: 'fullName', type: 'String' }],
  },
];

const models = new Models(modelDefinitions);
const Post = models.getModel('Post', 'entity');
const Person = models.getModel('Person', 'entity');

const post = { id: 'post-1', title: 'Hello' };
const person = { id: 'person-1', fullName: 'Jane Doe (jane@example.com)' };

describe('getTechnicalDisplay', () => {
  it('quotes the display value', () => {
    expect(getTechnicalDisplay(Post, post)).toBe('Post "Hello" (post-1)');
  });

  // The caller is shown the display even for a sensitive model: whoever triggered the error has to be
  // able to tell which record is meant, and `sensitiveDisplay` only governs what may be logged.
  it('quotes the display value of a sensitive model too', () => {
    expect(getTechnicalDisplay(Person, person)).toBe('Person "Jane Doe (jane@example.com)" (person-1)');
  });

  it('falls back to the id when the entity has no display value', () => {
    expect(getTechnicalDisplay(Post, { id: 'post-1' })).toBe('Post post-1');
  });

  it('falls back to the model name when the entity has neither display value nor id', () => {
    expect(getTechnicalDisplay(Person, {})).toBe('Person');
  });
});

describe('getLogSafeTechnicalDisplay', () => {
  it('leaves out a sensitive display value, keeping the id', () => {
    expect(getLogSafeTechnicalDisplay(Person, person)).toBe('Person person-1');
  });

  it('keeps the display value of a model that is not sensitive', () => {
    expect(getLogSafeTechnicalDisplay(Post, post)).toBe('Post "Hello" (post-1)');
  });

  it('falls back to the model name for a sensitive entity with no id', () => {
    expect(getLogSafeTechnicalDisplay(Person, {})).toBe('Person');
  });
});

describe('technicalMessage', () => {
  it('builds both variants from one template', () => {
    const { message, logMessage } = technicalMessage((display) => `${display(Person, person)} is not deleted.`);

    expect(message).toBe('Person "Jane Doe (jane@example.com)" (person-1) is not deleted.');
    expect(logMessage).toBe('Person person-1 is not deleted.');
  });

  it('redacts every entity a message names, not just the first', () => {
    const { message, logMessage } = technicalMessage(
      (display) => `${display(Person, person)} cannot be deleted because it has ${display(Person, { id: 'person-2', fullName: 'Jo Bloggs' })}.`,
    );

    expect(message).toContain('Jane Doe (jane@example.com)');
    expect(message).toContain('Jo Bloggs');
    expect(logMessage).toBe('Person person-1 cannot be deleted because it has Person person-2.');
  });

  it('leaves a message that names no sensitive entity identical in both variants', () => {
    const { message, logMessage } = technicalMessage((display) => `${display(Post, post)} is already deleted.`);

    expect(logMessage).toBe(message);
  });
});
