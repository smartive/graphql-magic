import { ModelDefinitions, Models } from '../../src/models';
import { getTechnicalDisplay } from '../../src/resolvers/utils';

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

describe('getTechnicalDisplay', () => {
  it('quotes the display value of an ordinary model', () => {
    expect(getTechnicalDisplay(Post, { id: 'post-1', title: 'Hello' })).toBe('Post "Hello" (post-1)');
  });

  it('leaves out a sensitive display value, keeping the id', () => {
    expect(getTechnicalDisplay(Person, { id: 'person-1', fullName: 'Jane Doe (jane@example.com)' })).toBe(
      'Person person-1',
    );
  });

  it('falls back to the id when the entity has no display value', () => {
    expect(getTechnicalDisplay(Post, { id: 'post-1' })).toBe('Post post-1');
  });

  it('falls back to the model name when the entity has neither display value nor id', () => {
    expect(getTechnicalDisplay(Person, {})).toBe('Person');
  });
});
