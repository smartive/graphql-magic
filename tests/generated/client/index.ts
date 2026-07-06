/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import type * as Types from './schema';

import type { Time } from '@smartive/graphql-magic';
export * from './schema';
export type DeleteAnotherObjectMutationVariables = Exact<{ [key: string]: never }>;

export type DeleteAnotherObjectMutation = { deleteAnotherObject: string };

export type GetAnotherObjectQueryVariables = Exact<{ [key: string]: never }>;

export type GetAnotherObjectQuery = { anotherObjects: Array<{ id: string; deleted: boolean }> };

export type GetReactionsQueryVariables = Exact<{ [key: string]: never }>;

export type GetReactionsQuery = {
  reactions: Array<
    | { type: Types.ReactionType; content: string | null }
    | { type: Types.ReactionType; content: string | null }
    | { rating: number | null; type: Types.ReactionType; content: string | null }
  >;
};

export type GetReactionQueryVariables = Exact<{ [key: string]: never }>;

export type GetReactionQuery = {
  reaction:
    | { type: Types.ReactionType; content: string | null }
    | { type: Types.ReactionType; content: string | null }
    | { rating: number | null; type: Types.ReactionType; content: string | null };
};

export type GetReviewsQueryVariables = Exact<{ [key: string]: never }>;

export type GetReviewsQuery = {
  reviews: Array<{ type: Types.ReactionType; content: string | null; rating: number | null }>;
};

export type GetReviewQueryVariables = Exact<{ [key: string]: never }>;

export type GetReviewQuery = { review: { type: Types.ReactionType; content: string | null; rating: number | null } };

export type CreateReviewMutationVariables = Exact<{
  data: Types.CreateReview;
}>;

export type CreateReviewMutation = { createReview: { content: string | null; rating: number | null } };

export type UpdateReviewMutationVariables = Exact<{
  id: string | number;
  data: Types.UpdateReview;
}>;

export type UpdateReviewMutation = { updateReview: { content: string | null; rating: number | null } };

export type SomeQueryQueryVariables = Exact<{ [key: string]: never }>;

export type SomeQueryQuery = {
  manyObjects: Array<{
    id: string;
    field: string | null;
    xyz: number;
    time: Time | null;
    another: { id: string; manyObjects: Array<{ id: string; field: string | null }> } | null;
  }>;
};

export type GetTimesQueryVariables = Exact<{ [key: string]: never }>;

export type GetTimesQuery = { manyObjects: Array<{ id: string; xyz: number; time: Time | null }> };

export type ReverseFiltersQueryQueryVariables = Exact<{ [key: string]: never }>;

export type ReverseFiltersQueryQuery = {
  all: Array<{ id: string; manyObjects: Array<{ float: number }> }>;
  withFloat0: Array<{ id: string; manyObjects: Array<{ float: number }> }>;
  withFloat0_5: Array<{ id: string; manyObjects: Array<{ float: number }> }>;
  noneFloat0: Array<{ id: string; manyObjects: Array<{ float: number }> }>;
  noneFloat0_5: Array<{ id: string; manyObjects: Array<{ float: number }> }>;
  noneFloat2: Array<{ id: string; manyObjects: Array<{ float: number }> }>;
};

export type NotQueryQueryVariables = Exact<{ [key: string]: never }>;

export type NotQueryQuery = { manyObjects: Array<{ id: string }> };

export type AndQueryQueryVariables = Exact<{ [key: string]: never }>;

export type AndQueryQuery = { manyObjects: Array<{ id: string }> };

export type OrQueryQueryVariables = Exact<{ [key: string]: never }>;

export type OrQueryQuery = { manyObjects: Array<{ id: string }> };

export type NullFilterQueryQueryVariables = Exact<{ [key: string]: never }>;

export type NullFilterQueryQuery = {
  all: Array<{ id: string; field: string | null }>;
  withNullField: Array<{ id: string; field: string | null }>;
  withNotNullField: Array<{ id: string; field: string | null }>;
  withSpecificField: Array<{ id: string; field: string | null }>;
  withComplexFilter: Array<{ id: string; field: string | null }>;
  withNestedFilter: Array<{
    id: string;
    field: string | null;
    another: { manyObjects: Array<{ id: string; field: string | null }> } | null;
  }>;
};

export type NullRelationFilterQueryQueryVariables = Exact<{ [key: string]: never }>;

export type NullRelationFilterQueryQuery = {
  all: Array<{ id: string; another: { id: string } | null }>;
  withNullAnother: Array<{ id: string; another: { id: string } | null }>;
  withNotNullAnother: Array<{ id: string; another: { id: string } | null }>;
};

export type DeleteAnotherObjectMutationMutationVariables = Exact<{
  id: string | number;
}>;

export type DeleteAnotherObjectMutationMutation = { deleteAnotherObject: string };

export type RestoreAnotherObjectMutationMutationVariables = Exact<{
  id: string | number;
}>;

export type RestoreAnotherObjectMutationMutation = { restoreAnotherObject: string };

export type CreateSomeObjectMutationMutationVariables = Exact<{
  data: Types.CreateSomeObject;
}>;

export type CreateSomeObjectMutationMutation = { createSomeObject: { id: string } };

export type UpdateSomeObjectMutationMutationVariables = Exact<{
  id: string | number;
  data: Types.UpdateSomeObject;
}>;

export type UpdateSomeObjectMutationMutation = { updateSomeObject: { id: string } };

export type DeleteSomeObjectMutationMutationVariables = Exact<{
  id: string | number;
}>;

export type DeleteSomeObjectMutationMutation = { deleteSomeObject: string };

export type RestoreSomeObjectMutationMutationVariables = Exact<{
  id: string | number;
}>;

export type RestoreSomeObjectMutationMutation = { restoreSomeObject: string };

export type CreateReviewMutationMutationVariables = Exact<{
  data: Types.CreateReview;
}>;

export type CreateReviewMutationMutation = { createReview: { id: string } };

export type UpdateReviewMutationMutationVariables = Exact<{
  id: string | number;
  data: Types.UpdateReview;
}>;

export type UpdateReviewMutationMutation = { updateReview: { id: string } };

export type DeleteReviewMutationMutationVariables = Exact<{
  id: string | number;
}>;

export type DeleteReviewMutationMutation = { deleteReview: string };

export type RestoreReviewMutationMutationVariables = Exact<{
  id: string | number;
}>;

export type RestoreReviewMutationMutation = { restoreReview: string };

export type CreateQuestionMutationMutationVariables = Exact<{
  data: Types.CreateQuestion;
}>;

export type CreateQuestionMutationMutation = { createQuestion: { id: string } };

export type UpdateQuestionMutationMutationVariables = Exact<{
  id: string | number;
  data: Types.UpdateQuestion;
}>;

export type UpdateQuestionMutationMutation = { updateQuestion: { id: string } };

export type DeleteQuestionMutationMutationVariables = Exact<{
  id: string | number;
}>;

export type DeleteQuestionMutationMutation = { deleteQuestion: string };

export type RestoreQuestionMutationMutationVariables = Exact<{
  id: string | number;
}>;

export type RestoreQuestionMutationMutation = { restoreQuestion: string };

export type CreateAnswerMutationMutationVariables = Exact<{
  data: Types.CreateAnswer;
}>;

export type CreateAnswerMutationMutation = { createAnswer: { id: string } };

export type UpdateAnswerMutationMutationVariables = Exact<{
  id: string | number;
  data: Types.UpdateAnswer;
}>;

export type UpdateAnswerMutationMutation = { updateAnswer: { id: string } };

export type DeleteAnswerMutationMutationVariables = Exact<{
  id: string | number;
}>;

export type DeleteAnswerMutationMutation = { deleteAnswer: string };

export type RestoreAnswerMutationMutationVariables = Exact<{
  id: string | number;
}>;

export type RestoreAnswerMutationMutation = { restoreAnswer: string };
