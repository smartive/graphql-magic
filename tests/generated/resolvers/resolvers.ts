import { resolveUser } from './user/resolver';
import { resolveSomeObject } from './some-object/resolver';
import { resolveReaction } from './reaction/resolver';
import { resolveReview } from './review/resolver';
import { resolveQuestion } from './question/resolver';
import { resolveAnswer } from './answer/resolver';
import { resolveAnotherObject } from './another-object/resolver';

export const resolvers = {
  Query: {
    me: resolveUser,
    someObject: resolveSomeObject,
    reaction: resolveReaction,
    review: resolveReview,
    question: resolveQuestion,
    answer: resolveAnswer,
    anotherObjects: resolveAnotherObject,
    manyObjects: resolveSomeObject,
    reactions: resolveReaction,
    reviews: resolveReview,
    questions: resolveQuestion,
    answers: resolveAnswer,
  },
  Reaction: {
    __resolveType: ({ TYPE }: { TYPE: string }) => TYPE,
  },
};
