import { GraphQLResolveInfo, GraphQLScalarType, GraphQLScalarTypeConfig } from 'graphql';
import { DateTime } from 'luxon';
import type { Time } from '@smartive/graphql-magic';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
export type RequireFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string };
  String: { input: string; output: string };
  Boolean: { input: boolean; output: boolean };
  Int: { input: number; output: number };
  Float: { input: number; output: number };
  DateTime: { input: DateTime; output: DateTime };
  Time: { input: Time; output: Time };
  Upload: { input: unknown; output: unknown };
};

export type AnotherObject = {
  __typename?: 'AnotherObject';
  deleteRootId?: Maybe<Scalars['ID']['output']>;
  deleteRootType?: Maybe<Scalars['String']['output']>;
  deleted: Scalars['Boolean']['output'];
  deletedAt?: Maybe<Scalars['DateTime']['output']>;
  deletedBy?: Maybe<User>;
  id: Scalars['ID']['output'];
  manyObjects: Array<SomeObject>;
  myself?: Maybe<AnotherObject>;
  name?: Maybe<Scalars['String']['output']>;
  self?: Maybe<AnotherObject>;
};

export type AnotherObjectManyObjectsArgs = {
  deleted?: InputMaybe<Scalars['Boolean']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<SomeObjectOrderBy>>;
  search?: InputMaybe<Scalars['String']['input']>;
  where?: InputMaybe<SomeObjectWhere>;
};

export type AnotherObjectSelfArgs = {
  deleted?: InputMaybe<Scalars['Boolean']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<AnotherObjectOrderBy>>;
  where?: InputMaybe<AnotherObjectWhere>;
};

export type AnotherObjectOrderBy = {
  deletedAt?: InputMaybe<Order>;
  name?: InputMaybe<Order>;
};

export type AnotherObjectSubWhere = {
  AND?: InputMaybe<Array<AnotherObjectSubWhere>>;
  NOT?: InputMaybe<AnotherObjectSubWhere>;
  OR?: InputMaybe<Array<AnotherObjectSubWhere>>;
  id?: InputMaybe<Array<Scalars['ID']['input']>>;
  manyObjects_NONE?: InputMaybe<SomeObjectWhere>;
  manyObjects_SOME?: InputMaybe<SomeObjectWhere>;
};

export type AnotherObjectWhere = {
  AND?: InputMaybe<Array<AnotherObjectSubWhere>>;
  NOT?: InputMaybe<AnotherObjectSubWhere>;
  OR?: InputMaybe<Array<AnotherObjectSubWhere>>;
  id?: InputMaybe<Array<Scalars['ID']['input']>>;
  manyObjects_NONE?: InputMaybe<SomeObjectWhere>;
  manyObjects_SOME?: InputMaybe<SomeObjectWhere>;
};

export type AnotherObjectWhereLookup = {
  id?: InputMaybe<Scalars['ID']['input']>;
};

export type AnotherObjectWhereUnique = {
  id?: InputMaybe<Scalars['ID']['input']>;
};

export type Answer = Reaction & {
  __typename?: 'Answer';
  childAnswers: Array<Answer>;
  childQuestions: Array<Question>;
  childReactions: Array<Reaction>;
  childReviews: Array<Review>;
  content?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  createdBy: User;
  deleteRootId?: Maybe<Scalars['ID']['output']>;
  deleteRootType?: Maybe<Scalars['String']['output']>;
  deleted: Scalars['Boolean']['output'];
  deletedAt?: Maybe<Scalars['DateTime']['output']>;
  deletedBy?: Maybe<User>;
  id: Scalars['ID']['output'];
  parent?: Maybe<Reaction>;
  type: ReactionType;
  updatedAt: Scalars['DateTime']['output'];
  updatedBy: User;
};

export type AnswerChildAnswersArgs = {
  deleted?: InputMaybe<Scalars['Boolean']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<AnswerOrderBy>>;
  where?: InputMaybe<AnswerWhere>;
};

export type AnswerChildQuestionsArgs = {
  deleted?: InputMaybe<Scalars['Boolean']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<QuestionOrderBy>>;
  where?: InputMaybe<QuestionWhere>;
};

export type AnswerChildReactionsArgs = {
  deleted?: InputMaybe<Scalars['Boolean']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<ReactionOrderBy>>;
  where?: InputMaybe<ReactionWhere>;
};

export type AnswerChildReviewsArgs = {
  deleted?: InputMaybe<Scalars['Boolean']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<ReviewOrderBy>>;
  where?: InputMaybe<ReviewWhere>;
};

export type AnswerOrderBy = {
  createdAt?: InputMaybe<Order>;
  deletedAt?: InputMaybe<Order>;
  updatedAt?: InputMaybe<Order>;
};

export type AnswerSubWhere = {
  AND?: InputMaybe<Array<AnswerSubWhere>>;
  NOT?: InputMaybe<AnswerSubWhere>;
  OR?: InputMaybe<Array<AnswerSubWhere>>;
  id?: InputMaybe<Array<Scalars['ID']['input']>>;
};

export type AnswerWhere = {
  AND?: InputMaybe<Array<AnswerSubWhere>>;
  NOT?: InputMaybe<AnswerSubWhere>;
  OR?: InputMaybe<Array<AnswerSubWhere>>;
  id?: InputMaybe<Array<Scalars['ID']['input']>>;
};

export type AnswerWhereLookup = {
  id?: InputMaybe<Scalars['ID']['input']>;
};

export type AnswerWhereUnique = {
  id?: InputMaybe<Scalars['ID']['input']>;
};

export type Bird = Duck | Eagle;

export type CreateAnswer = {
  content?: InputMaybe<Scalars['String']['input']>;
};

export type CreateQuestion = {
  content?: InputMaybe<Scalars['String']['input']>;
};

export type CreateReview = {
  content?: InputMaybe<Scalars['String']['input']>;
  rating?: InputMaybe<Scalars['Float']['input']>;
};

export type CreateSomeObject = {
  time?: InputMaybe<Scalars['Time']['input']>;
  xyz: Scalars['Int']['input'];
};

export type Duck = {
  __typename?: 'Duck';
  name?: Maybe<Scalars['String']['output']>;
};

export type Eagle = {
  __typename?: 'Eagle';
  name?: Maybe<Scalars['String']['output']>;
};

export type Mutation = {
  __typename?: 'Mutation';
  createAnswer: Answer;
  createQuestion: Question;
  createReview: Review;
  createSomeObject: SomeObject;
  deleteAnotherObject: Scalars['ID']['output'];
  deleteAnswer: Scalars['ID']['output'];
  deleteQuestion: Scalars['ID']['output'];
  deleteReview: Scalars['ID']['output'];
  deleteSomeObject: Scalars['ID']['output'];
  restoreAnotherObject: Scalars['ID']['output'];
  restoreAnswer: Scalars['ID']['output'];
  restoreQuestion: Scalars['ID']['output'];
  restoreReview: Scalars['ID']['output'];
  restoreSomeObject: Scalars['ID']['output'];
  updateAnswer: Answer;
  updateQuestion: Question;
  updateReview: Review;
  updateSomeObject: SomeObject;
};

export type MutationCreateAnswerArgs = {
  data: CreateAnswer;
};

export type MutationCreateQuestionArgs = {
  data: CreateQuestion;
};

export type MutationCreateReviewArgs = {
  data: CreateReview;
};

export type MutationCreateSomeObjectArgs = {
  data: CreateSomeObject;
};

export type MutationDeleteAnotherObjectArgs = {
  dryRun?: InputMaybe<Scalars['Boolean']['input']>;
  where: AnotherObjectWhereUnique;
};

export type MutationDeleteAnswerArgs = {
  dryRun?: InputMaybe<Scalars['Boolean']['input']>;
  where: AnswerWhereUnique;
};

export type MutationDeleteQuestionArgs = {
  dryRun?: InputMaybe<Scalars['Boolean']['input']>;
  where: QuestionWhereUnique;
};

export type MutationDeleteReviewArgs = {
  dryRun?: InputMaybe<Scalars['Boolean']['input']>;
  where: ReviewWhereUnique;
};

export type MutationDeleteSomeObjectArgs = {
  dryRun?: InputMaybe<Scalars['Boolean']['input']>;
  where: SomeObjectWhereUnique;
};

export type MutationRestoreAnotherObjectArgs = {
  where: AnotherObjectWhereUnique;
};

export type MutationRestoreAnswerArgs = {
  where: AnswerWhereUnique;
};

export type MutationRestoreQuestionArgs = {
  where: QuestionWhereUnique;
};

export type MutationRestoreReviewArgs = {
  where: ReviewWhereUnique;
};

export type MutationRestoreSomeObjectArgs = {
  where: SomeObjectWhereUnique;
};

export type MutationUpdateAnswerArgs = {
  data: UpdateAnswer;
  where: AnswerWhereUnique;
};

export type MutationUpdateQuestionArgs = {
  data: UpdateQuestion;
  where: QuestionWhereUnique;
};

export type MutationUpdateReviewArgs = {
  data: UpdateReview;
  where: ReviewWhereUnique;
};

export type MutationUpdateSomeObjectArgs = {
  data: UpdateSomeObject;
  where: SomeObjectWhereUnique;
};

export enum Order {
  Asc = 'ASC',
  Desc = 'DESC',
}

export type Query = {
  __typename?: 'Query';
  anotherObjects: Array<AnotherObject>;
  answer: Answer;
  answers: Array<Answer>;
  birds: Array<Bird>;
  manyObjects: Array<SomeObject>;
  me?: Maybe<User>;
  question: Question;
  questions: Array<Question>;
  reaction: Reaction;
  reactions: Array<Reaction>;
  review: Review;
  reviews: Array<Review>;
  someObject: SomeObject;
};

export type QueryAnotherObjectsArgs = {
  deleted?: InputMaybe<Scalars['Boolean']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<AnotherObjectOrderBy>>;
  where?: InputMaybe<AnotherObjectWhere>;
};

export type QueryAnswerArgs = {
  deleted?: InputMaybe<Scalars['Boolean']['input']>;
  where: AnswerWhereLookup;
};

export type QueryAnswersArgs = {
  deleted?: InputMaybe<Scalars['Boolean']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<AnswerOrderBy>>;
  where?: InputMaybe<AnswerWhere>;
};

export type QueryManyObjectsArgs = {
  deleted?: InputMaybe<Scalars['Boolean']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<SomeObjectOrderBy>>;
  search?: InputMaybe<Scalars['String']['input']>;
  where?: InputMaybe<SomeObjectWhere>;
};

export type QueryQuestionArgs = {
  deleted?: InputMaybe<Scalars['Boolean']['input']>;
  where: QuestionWhereLookup;
};

export type QueryQuestionsArgs = {
  deleted?: InputMaybe<Scalars['Boolean']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<QuestionOrderBy>>;
  where?: InputMaybe<QuestionWhere>;
};

export type QueryReactionArgs = {
  deleted?: InputMaybe<Scalars['Boolean']['input']>;
  where: ReactionWhereLookup;
};

export type QueryReactionsArgs = {
  deleted?: InputMaybe<Scalars['Boolean']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<ReactionOrderBy>>;
  where?: InputMaybe<ReactionWhere>;
};

export type QueryReviewArgs = {
  deleted?: InputMaybe<Scalars['Boolean']['input']>;
  where: ReviewWhereLookup;
};

export type QueryReviewsArgs = {
  deleted?: InputMaybe<Scalars['Boolean']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<ReviewOrderBy>>;
  where?: InputMaybe<ReviewWhere>;
};

export type QuerySomeObjectArgs = {
  deleted?: InputMaybe<Scalars['Boolean']['input']>;
  where: SomeObjectWhereLookup;
};

export type Question = Reaction & {
  __typename?: 'Question';
  childAnswers: Array<Answer>;
  childQuestions: Array<Question>;
  childReactions: Array<Reaction>;
  childReviews: Array<Review>;
  content?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  createdBy: User;
  deleteRootId?: Maybe<Scalars['ID']['output']>;
  deleteRootType?: Maybe<Scalars['String']['output']>;
  deleted: Scalars['Boolean']['output'];
  deletedAt?: Maybe<Scalars['DateTime']['output']>;
  deletedBy?: Maybe<User>;
  id: Scalars['ID']['output'];
  parent?: Maybe<Reaction>;
  type: ReactionType;
  updatedAt: Scalars['DateTime']['output'];
  updatedBy: User;
};

export type QuestionChildAnswersArgs = {
  deleted?: InputMaybe<Scalars['Boolean']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<AnswerOrderBy>>;
  where?: InputMaybe<AnswerWhere>;
};

export type QuestionChildQuestionsArgs = {
  deleted?: InputMaybe<Scalars['Boolean']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<QuestionOrderBy>>;
  where?: InputMaybe<QuestionWhere>;
};

export type QuestionChildReactionsArgs = {
  deleted?: InputMaybe<Scalars['Boolean']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<ReactionOrderBy>>;
  where?: InputMaybe<ReactionWhere>;
};

export type QuestionChildReviewsArgs = {
  deleted?: InputMaybe<Scalars['Boolean']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<ReviewOrderBy>>;
  where?: InputMaybe<ReviewWhere>;
};

export type QuestionOrderBy = {
  createdAt?: InputMaybe<Order>;
  deletedAt?: InputMaybe<Order>;
  updatedAt?: InputMaybe<Order>;
};

export type QuestionSubWhere = {
  AND?: InputMaybe<Array<QuestionSubWhere>>;
  NOT?: InputMaybe<QuestionSubWhere>;
  OR?: InputMaybe<Array<QuestionSubWhere>>;
  id?: InputMaybe<Array<Scalars['ID']['input']>>;
};

export type QuestionWhere = {
  AND?: InputMaybe<Array<QuestionSubWhere>>;
  NOT?: InputMaybe<QuestionSubWhere>;
  OR?: InputMaybe<Array<QuestionSubWhere>>;
  id?: InputMaybe<Array<Scalars['ID']['input']>>;
};

export type QuestionWhereLookup = {
  id?: InputMaybe<Scalars['ID']['input']>;
};

export type QuestionWhereUnique = {
  id?: InputMaybe<Scalars['ID']['input']>;
};

export type Reaction = {
  childAnswers: Array<Answer>;
  childQuestions: Array<Question>;
  childReactions: Array<Reaction>;
  childReviews: Array<Review>;
  content?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  createdBy: User;
  deleteRootId?: Maybe<Scalars['ID']['output']>;
  deleteRootType?: Maybe<Scalars['String']['output']>;
  deleted: Scalars['Boolean']['output'];
  deletedAt?: Maybe<Scalars['DateTime']['output']>;
  deletedBy?: Maybe<User>;
  id: Scalars['ID']['output'];
  parent?: Maybe<Reaction>;
  type: ReactionType;
  updatedAt: Scalars['DateTime']['output'];
  updatedBy: User;
};

export type ReactionChildAnswersArgs = {
  deleted?: InputMaybe<Scalars['Boolean']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<AnswerOrderBy>>;
  where?: InputMaybe<AnswerWhere>;
};

export type ReactionChildQuestionsArgs = {
  deleted?: InputMaybe<Scalars['Boolean']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<QuestionOrderBy>>;
  where?: InputMaybe<QuestionWhere>;
};

export type ReactionChildReactionsArgs = {
  deleted?: InputMaybe<Scalars['Boolean']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<ReactionOrderBy>>;
  where?: InputMaybe<ReactionWhere>;
};

export type ReactionChildReviewsArgs = {
  deleted?: InputMaybe<Scalars['Boolean']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<ReviewOrderBy>>;
  where?: InputMaybe<ReviewWhere>;
};

export type ReactionOrderBy = {
  createdAt?: InputMaybe<Order>;
  deletedAt?: InputMaybe<Order>;
  updatedAt?: InputMaybe<Order>;
};

export type ReactionSubWhere = {
  AND?: InputMaybe<Array<ReactionSubWhere>>;
  NOT?: InputMaybe<ReactionSubWhere>;
  OR?: InputMaybe<Array<ReactionSubWhere>>;
  id?: InputMaybe<Array<Scalars['ID']['input']>>;
};

export enum ReactionType {
  Answer = 'Answer',
  Question = 'Question',
  Review = 'Review',
}

export type ReactionWhere = {
  AND?: InputMaybe<Array<ReactionSubWhere>>;
  NOT?: InputMaybe<ReactionSubWhere>;
  OR?: InputMaybe<Array<ReactionSubWhere>>;
  id?: InputMaybe<Array<Scalars['ID']['input']>>;
};

export type ReactionWhereLookup = {
  id?: InputMaybe<Scalars['ID']['input']>;
};

export type ReactionWhereUnique = {
  id?: InputMaybe<Scalars['ID']['input']>;
};

export type Review = Reaction & {
  __typename?: 'Review';
  childAnswers: Array<Answer>;
  childQuestions: Array<Question>;
  childReactions: Array<Reaction>;
  childReviews: Array<Review>;
  content?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  createdBy: User;
  deleteRootId?: Maybe<Scalars['ID']['output']>;
  deleteRootType?: Maybe<Scalars['String']['output']>;
  deleted: Scalars['Boolean']['output'];
  deletedAt?: Maybe<Scalars['DateTime']['output']>;
  deletedBy?: Maybe<User>;
  id: Scalars['ID']['output'];
  parent?: Maybe<Reaction>;
  rating?: Maybe<Scalars['Float']['output']>;
  type: ReactionType;
  updatedAt: Scalars['DateTime']['output'];
  updatedBy: User;
};

export type ReviewChildAnswersArgs = {
  deleted?: InputMaybe<Scalars['Boolean']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<AnswerOrderBy>>;
  where?: InputMaybe<AnswerWhere>;
};

export type ReviewChildQuestionsArgs = {
  deleted?: InputMaybe<Scalars['Boolean']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<QuestionOrderBy>>;
  where?: InputMaybe<QuestionWhere>;
};

export type ReviewChildReactionsArgs = {
  deleted?: InputMaybe<Scalars['Boolean']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<ReactionOrderBy>>;
  where?: InputMaybe<ReactionWhere>;
};

export type ReviewChildReviewsArgs = {
  deleted?: InputMaybe<Scalars['Boolean']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<ReviewOrderBy>>;
  where?: InputMaybe<ReviewWhere>;
};

export type ReviewOrderBy = {
  createdAt?: InputMaybe<Order>;
  deletedAt?: InputMaybe<Order>;
  updatedAt?: InputMaybe<Order>;
};

export type ReviewSubWhere = {
  AND?: InputMaybe<Array<ReviewSubWhere>>;
  NOT?: InputMaybe<ReviewSubWhere>;
  OR?: InputMaybe<Array<ReviewSubWhere>>;
  id?: InputMaybe<Array<Scalars['ID']['input']>>;
  rating_GT?: InputMaybe<Scalars['Float']['input']>;
  rating_GTE?: InputMaybe<Scalars['Float']['input']>;
  rating_LT?: InputMaybe<Scalars['Float']['input']>;
  rating_LTE?: InputMaybe<Scalars['Float']['input']>;
};

export type ReviewWhere = {
  AND?: InputMaybe<Array<ReviewSubWhere>>;
  NOT?: InputMaybe<ReviewSubWhere>;
  OR?: InputMaybe<Array<ReviewSubWhere>>;
  id?: InputMaybe<Array<Scalars['ID']['input']>>;
  rating_GT?: InputMaybe<Scalars['Float']['input']>;
  rating_GTE?: InputMaybe<Scalars['Float']['input']>;
  rating_LT?: InputMaybe<Scalars['Float']['input']>;
  rating_LTE?: InputMaybe<Scalars['Float']['input']>;
};

export type ReviewWhereLookup = {
  id?: InputMaybe<Scalars['ID']['input']>;
};

export type ReviewWhereUnique = {
  id?: InputMaybe<Scalars['ID']['input']>;
};

export enum Role {
  Admin = 'ADMIN',
  User = 'USER',
}

export enum SomeEnum {
  A = 'A',
  B = 'B',
  C = 'C',
}

export type SomeObject = {
  __typename?: 'SomeObject';
  another?: Maybe<AnotherObject>;
  createdAt: Scalars['DateTime']['output'];
  createdBy: User;
  deleteRootId?: Maybe<Scalars['ID']['output']>;
  deleteRootType?: Maybe<Scalars['String']['output']>;
  deleted: Scalars['Boolean']['output'];
  deletedAt?: Maybe<Scalars['DateTime']['output']>;
  deletedBy?: Maybe<User>;
  field?: Maybe<Scalars['String']['output']>;
  float: Scalars['Float']['output'];
  id: Scalars['ID']['output'];
  list: Array<SomeEnum>;
  time?: Maybe<Scalars['Time']['output']>;
  updatedAt: Scalars['DateTime']['output'];
  updatedBy: User;
  xyz: Scalars['Int']['output'];
};

export type SomeObjectListArgs = {
  magic?: InputMaybe<Scalars['Boolean']['input']>;
};

export type SomeObjectOrderBy = {
  createdAt?: InputMaybe<Order>;
  deletedAt?: InputMaybe<Order>;
  updatedAt?: InputMaybe<Order>;
  xyz?: InputMaybe<Order>;
};

export type SomeObjectSubWhere = {
  AND?: InputMaybe<Array<SomeObjectSubWhere>>;
  NOT?: InputMaybe<SomeObjectSubWhere>;
  OR?: InputMaybe<Array<SomeObjectSubWhere>>;
  another?: InputMaybe<AnotherObjectWhere>;
  field?: InputMaybe<Array<Scalars['String']['input']>>;
  float?: InputMaybe<Array<Scalars['Float']['input']>>;
  id?: InputMaybe<Array<Scalars['ID']['input']>>;
  xyz?: InputMaybe<Array<Scalars['Int']['input']>>;
};

export type SomeObjectWhere = {
  AND?: InputMaybe<Array<SomeObjectSubWhere>>;
  NOT?: InputMaybe<SomeObjectSubWhere>;
  OR?: InputMaybe<Array<SomeObjectSubWhere>>;
  another?: InputMaybe<AnotherObjectWhere>;
  field?: InputMaybe<Array<Scalars['String']['input']>>;
  float?: InputMaybe<Array<Scalars['Float']['input']>>;
  id?: InputMaybe<Array<Scalars['ID']['input']>>;
  xyz?: InputMaybe<Array<Scalars['Int']['input']>>;
};

export type SomeObjectWhereLookup = {
  id?: InputMaybe<Scalars['ID']['input']>;
};

export type SomeObjectWhereUnique = {
  id?: InputMaybe<Scalars['ID']['input']>;
};

export type SomeRawObject = {
  __typename?: 'SomeRawObject';
  field?: Maybe<Scalars['String']['output']>;
};

export type UpdateAnswer = {
  content?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateQuestion = {
  content?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateReview = {
  content?: InputMaybe<Scalars['String']['input']>;
  rating?: InputMaybe<Scalars['Float']['input']>;
};

export type UpdateSomeObject = {
  anotherId?: InputMaybe<Scalars['ID']['input']>;
  time?: InputMaybe<Scalars['Time']['input']>;
  xyz?: InputMaybe<Scalars['Int']['input']>;
};

export type User = {
  __typename?: 'User';
  createdAnswers: Array<Answer>;
  createdManyObjects: Array<SomeObject>;
  createdQuestions: Array<Question>;
  createdReactions: Array<Reaction>;
  createdReviews: Array<Review>;
  deletedAnotherObjects: Array<AnotherObject>;
  deletedAnswers: Array<Answer>;
  deletedManyObjects: Array<SomeObject>;
  deletedQuestions: Array<Question>;
  deletedReactions: Array<Reaction>;
  deletedReviews: Array<Review>;
  id: Scalars['ID']['output'];
  role: Role;
  updatedAnswers: Array<Answer>;
  updatedManyObjects: Array<SomeObject>;
  updatedQuestions: Array<Question>;
  updatedReactions: Array<Reaction>;
  updatedReviews: Array<Review>;
  username?: Maybe<Scalars['String']['output']>;
};

export type UserCreatedAnswersArgs = {
  deleted?: InputMaybe<Scalars['Boolean']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<AnswerOrderBy>>;
  where?: InputMaybe<AnswerWhere>;
};

export type UserCreatedManyObjectsArgs = {
  deleted?: InputMaybe<Scalars['Boolean']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<SomeObjectOrderBy>>;
  search?: InputMaybe<Scalars['String']['input']>;
  where?: InputMaybe<SomeObjectWhere>;
};

export type UserCreatedQuestionsArgs = {
  deleted?: InputMaybe<Scalars['Boolean']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<QuestionOrderBy>>;
  where?: InputMaybe<QuestionWhere>;
};

export type UserCreatedReactionsArgs = {
  deleted?: InputMaybe<Scalars['Boolean']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<ReactionOrderBy>>;
  where?: InputMaybe<ReactionWhere>;
};

export type UserCreatedReviewsArgs = {
  deleted?: InputMaybe<Scalars['Boolean']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<ReviewOrderBy>>;
  where?: InputMaybe<ReviewWhere>;
};

export type UserDeletedAnotherObjectsArgs = {
  deleted?: InputMaybe<Scalars['Boolean']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<AnotherObjectOrderBy>>;
  where?: InputMaybe<AnotherObjectWhere>;
};

export type UserDeletedAnswersArgs = {
  deleted?: InputMaybe<Scalars['Boolean']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<AnswerOrderBy>>;
  where?: InputMaybe<AnswerWhere>;
};

export type UserDeletedManyObjectsArgs = {
  deleted?: InputMaybe<Scalars['Boolean']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<SomeObjectOrderBy>>;
  search?: InputMaybe<Scalars['String']['input']>;
  where?: InputMaybe<SomeObjectWhere>;
};

export type UserDeletedQuestionsArgs = {
  deleted?: InputMaybe<Scalars['Boolean']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<QuestionOrderBy>>;
  where?: InputMaybe<QuestionWhere>;
};

export type UserDeletedReactionsArgs = {
  deleted?: InputMaybe<Scalars['Boolean']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<ReactionOrderBy>>;
  where?: InputMaybe<ReactionWhere>;
};

export type UserDeletedReviewsArgs = {
  deleted?: InputMaybe<Scalars['Boolean']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<ReviewOrderBy>>;
  where?: InputMaybe<ReviewWhere>;
};

export type UserUpdatedAnswersArgs = {
  deleted?: InputMaybe<Scalars['Boolean']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<AnswerOrderBy>>;
  where?: InputMaybe<AnswerWhere>;
};

export type UserUpdatedManyObjectsArgs = {
  deleted?: InputMaybe<Scalars['Boolean']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<SomeObjectOrderBy>>;
  search?: InputMaybe<Scalars['String']['input']>;
  where?: InputMaybe<SomeObjectWhere>;
};

export type UserUpdatedQuestionsArgs = {
  deleted?: InputMaybe<Scalars['Boolean']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<QuestionOrderBy>>;
  where?: InputMaybe<QuestionWhere>;
};

export type UserUpdatedReactionsArgs = {
  deleted?: InputMaybe<Scalars['Boolean']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<ReactionOrderBy>>;
  where?: InputMaybe<ReactionWhere>;
};

export type UserUpdatedReviewsArgs = {
  deleted?: InputMaybe<Scalars['Boolean']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<ReviewOrderBy>>;
  where?: InputMaybe<ReviewWhere>;
};

export type UserSubWhere = {
  AND?: InputMaybe<Array<UserSubWhere>>;
  NOT?: InputMaybe<UserSubWhere>;
  OR?: InputMaybe<Array<UserSubWhere>>;
  id?: InputMaybe<Array<Scalars['ID']['input']>>;
};

export type UserWhere = {
  AND?: InputMaybe<Array<UserSubWhere>>;
  NOT?: InputMaybe<UserSubWhere>;
  OR?: InputMaybe<Array<UserSubWhere>>;
  id?: InputMaybe<Array<Scalars['ID']['input']>>;
};

export type UserWhereLookup = {
  id?: InputMaybe<Scalars['ID']['input']>;
};

export type UserWhereUnique = {
  id?: InputMaybe<Scalars['ID']['input']>;
};

export type ResolverTypeWrapper<T> = Promise<T> | T;

export type ResolverWithResolve<TResult, TParent, TContext, TArgs> = {
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};
export type Resolver<
  TResult,
  TParent = Record<PropertyKey, never>,
  TContext = Record<PropertyKey, never>,
  TArgs = Record<PropertyKey, never>,
> = ResolverFn<TResult, TParent, TContext, TArgs> | ResolverWithResolve<TResult, TParent, TContext, TArgs>;

export type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo,
) => Promise<TResult> | TResult;

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo,
) => AsyncIterable<TResult> | Promise<AsyncIterable<TResult>>;

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo,
) => TResult | Promise<TResult>;

export interface SubscriptionSubscriberObject<TResult, TKey extends string, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<{ [key in TKey]: TResult }, TParent, TContext, TArgs>;
  resolve?: SubscriptionResolveFn<TResult, { [key in TKey]: TResult }, TContext, TArgs>;
}

export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>;
  resolve: SubscriptionResolveFn<TResult, any, TContext, TArgs>;
}

export type SubscriptionObject<TResult, TKey extends string, TParent, TContext, TArgs> =
  | SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs>
  | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>;

export type SubscriptionResolver<
  TResult,
  TKey extends string,
  TParent = Record<PropertyKey, never>,
  TContext = Record<PropertyKey, never>,
  TArgs = Record<PropertyKey, never>,
> =
  | ((...args: any[]) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
  | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>;

export type TypeResolveFn<TTypes, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>> = (
  parent: TParent,
  context: TContext,
  info: GraphQLResolveInfo,
) => Maybe<TTypes> | Promise<Maybe<TTypes>>;

export type IsTypeOfResolverFn<T = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>> = (
  obj: T,
  context: TContext,
  info: GraphQLResolveInfo,
) => boolean | Promise<boolean>;

export type NextResolverFn<T> = () => Promise<T>;

export type DirectiveResolverFn<
  TResult = Record<PropertyKey, never>,
  TParent = Record<PropertyKey, never>,
  TContext = Record<PropertyKey, never>,
  TArgs = Record<PropertyKey, never>,
> = (
  next: NextResolverFn<TResult>,
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo,
) => TResult | Promise<TResult>;

/** Mapping of union types */
export type ResolversUnionTypes<_RefType extends Record<string, unknown>> = {
  Bird: Duck | Eagle;
};

/** Mapping of interface types */
export type ResolversInterfaceTypes<_RefType extends Record<string, unknown>> = {
  Reaction:
    | (Omit<
        Answer,
        | 'childAnswers'
        | 'childQuestions'
        | 'childReactions'
        | 'childReviews'
        | 'createdBy'
        | 'deletedBy'
        | 'parent'
        | 'updatedBy'
      > & {
        childAnswers: Array<_RefType['Answer']>;
        childQuestions: Array<_RefType['Question']>;
        childReactions: Array<_RefType['Reaction']>;
        childReviews: Array<_RefType['Review']>;
        createdBy: _RefType['User'];
        deletedBy?: Maybe<_RefType['User']>;
        parent?: Maybe<_RefType['Reaction']>;
        updatedBy: _RefType['User'];
      })
    | (Omit<
        Question,
        | 'childAnswers'
        | 'childQuestions'
        | 'childReactions'
        | 'childReviews'
        | 'createdBy'
        | 'deletedBy'
        | 'parent'
        | 'updatedBy'
      > & {
        childAnswers: Array<_RefType['Answer']>;
        childQuestions: Array<_RefType['Question']>;
        childReactions: Array<_RefType['Reaction']>;
        childReviews: Array<_RefType['Review']>;
        createdBy: _RefType['User'];
        deletedBy?: Maybe<_RefType['User']>;
        parent?: Maybe<_RefType['Reaction']>;
        updatedBy: _RefType['User'];
      })
    | (Omit<
        Review,
        | 'childAnswers'
        | 'childQuestions'
        | 'childReactions'
        | 'childReviews'
        | 'createdBy'
        | 'deletedBy'
        | 'parent'
        | 'updatedBy'
      > & {
        childAnswers: Array<_RefType['Answer']>;
        childQuestions: Array<_RefType['Question']>;
        childReactions: Array<_RefType['Reaction']>;
        childReviews: Array<_RefType['Review']>;
        createdBy: _RefType['User'];
        deletedBy?: Maybe<_RefType['User']>;
        parent?: Maybe<_RefType['Reaction']>;
        updatedBy: _RefType['User'];
      });
};

/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = {
  AnotherObject: ResolverTypeWrapper<
    Omit<AnotherObject, 'deletedBy' | 'manyObjects' | 'myself' | 'self'> & {
      deletedBy?: Maybe<ResolversTypes['User']>;
      manyObjects: Array<ResolversTypes['SomeObject']>;
      myself?: Maybe<ResolversTypes['AnotherObject']>;
      self?: Maybe<ResolversTypes['AnotherObject']>;
    }
  >;
  AnotherObjectOrderBy: AnotherObjectOrderBy;
  AnotherObjectSubWhere: AnotherObjectSubWhere;
  AnotherObjectWhere: AnotherObjectWhere;
  AnotherObjectWhereLookup: AnotherObjectWhereLookup;
  AnotherObjectWhereUnique: AnotherObjectWhereUnique;
  Answer: ResolverTypeWrapper<
    Omit<
      Answer,
      | 'childAnswers'
      | 'childQuestions'
      | 'childReactions'
      | 'childReviews'
      | 'createdBy'
      | 'deletedBy'
      | 'parent'
      | 'updatedBy'
    > & {
      childAnswers: Array<ResolversTypes['Answer']>;
      childQuestions: Array<ResolversTypes['Question']>;
      childReactions: Array<ResolversTypes['Reaction']>;
      childReviews: Array<ResolversTypes['Review']>;
      createdBy: ResolversTypes['User'];
      deletedBy?: Maybe<ResolversTypes['User']>;
      parent?: Maybe<ResolversTypes['Reaction']>;
      updatedBy: ResolversTypes['User'];
    }
  >;
  AnswerOrderBy: AnswerOrderBy;
  AnswerSubWhere: AnswerSubWhere;
  AnswerWhere: AnswerWhere;
  AnswerWhereLookup: AnswerWhereLookup;
  AnswerWhereUnique: AnswerWhereUnique;
  Bird: ResolverTypeWrapper<ResolversUnionTypes<ResolversTypes>['Bird']>;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  CreateAnswer: CreateAnswer;
  CreateQuestion: CreateQuestion;
  CreateReview: CreateReview;
  CreateSomeObject: CreateSomeObject;
  DateTime: ResolverTypeWrapper<Scalars['DateTime']['output']>;
  Duck: ResolverTypeWrapper<Duck>;
  Eagle: ResolverTypeWrapper<Eagle>;
  Float: ResolverTypeWrapper<Scalars['Float']['output']>;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  Mutation: ResolverTypeWrapper<Record<PropertyKey, never>>;
  Order: Order;
  Query: ResolverTypeWrapper<Record<PropertyKey, never>>;
  Question: ResolverTypeWrapper<
    Omit<
      Question,
      | 'childAnswers'
      | 'childQuestions'
      | 'childReactions'
      | 'childReviews'
      | 'createdBy'
      | 'deletedBy'
      | 'parent'
      | 'updatedBy'
    > & {
      childAnswers: Array<ResolversTypes['Answer']>;
      childQuestions: Array<ResolversTypes['Question']>;
      childReactions: Array<ResolversTypes['Reaction']>;
      childReviews: Array<ResolversTypes['Review']>;
      createdBy: ResolversTypes['User'];
      deletedBy?: Maybe<ResolversTypes['User']>;
      parent?: Maybe<ResolversTypes['Reaction']>;
      updatedBy: ResolversTypes['User'];
    }
  >;
  QuestionOrderBy: QuestionOrderBy;
  QuestionSubWhere: QuestionSubWhere;
  QuestionWhere: QuestionWhere;
  QuestionWhereLookup: QuestionWhereLookup;
  QuestionWhereUnique: QuestionWhereUnique;
  Reaction: ResolverTypeWrapper<ResolversInterfaceTypes<ResolversTypes>['Reaction']>;
  ReactionOrderBy: ReactionOrderBy;
  ReactionSubWhere: ReactionSubWhere;
  ReactionType: ReactionType;
  ReactionWhere: ReactionWhere;
  ReactionWhereLookup: ReactionWhereLookup;
  ReactionWhereUnique: ReactionWhereUnique;
  Review: ResolverTypeWrapper<
    Omit<
      Review,
      | 'childAnswers'
      | 'childQuestions'
      | 'childReactions'
      | 'childReviews'
      | 'createdBy'
      | 'deletedBy'
      | 'parent'
      | 'updatedBy'
    > & {
      childAnswers: Array<ResolversTypes['Answer']>;
      childQuestions: Array<ResolversTypes['Question']>;
      childReactions: Array<ResolversTypes['Reaction']>;
      childReviews: Array<ResolversTypes['Review']>;
      createdBy: ResolversTypes['User'];
      deletedBy?: Maybe<ResolversTypes['User']>;
      parent?: Maybe<ResolversTypes['Reaction']>;
      updatedBy: ResolversTypes['User'];
    }
  >;
  ReviewOrderBy: ReviewOrderBy;
  ReviewSubWhere: ReviewSubWhere;
  ReviewWhere: ReviewWhere;
  ReviewWhereLookup: ReviewWhereLookup;
  ReviewWhereUnique: ReviewWhereUnique;
  Role: Role;
  SomeEnum: SomeEnum;
  SomeObject: ResolverTypeWrapper<
    Omit<SomeObject, 'another' | 'createdBy' | 'deletedBy' | 'updatedBy'> & {
      another?: Maybe<ResolversTypes['AnotherObject']>;
      createdBy: ResolversTypes['User'];
      deletedBy?: Maybe<ResolversTypes['User']>;
      updatedBy: ResolversTypes['User'];
    }
  >;
  SomeObjectOrderBy: SomeObjectOrderBy;
  SomeObjectSubWhere: SomeObjectSubWhere;
  SomeObjectWhere: SomeObjectWhere;
  SomeObjectWhereLookup: SomeObjectWhereLookup;
  SomeObjectWhereUnique: SomeObjectWhereUnique;
  SomeRawObject: ResolverTypeWrapper<SomeRawObject>;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  Time: ResolverTypeWrapper<Scalars['Time']['output']>;
  UpdateAnswer: UpdateAnswer;
  UpdateQuestion: UpdateQuestion;
  UpdateReview: UpdateReview;
  UpdateSomeObject: UpdateSomeObject;
  Upload: ResolverTypeWrapper<Scalars['Upload']['output']>;
  User: ResolverTypeWrapper<
    Omit<
      User,
      | 'createdAnswers'
      | 'createdManyObjects'
      | 'createdQuestions'
      | 'createdReactions'
      | 'createdReviews'
      | 'deletedAnotherObjects'
      | 'deletedAnswers'
      | 'deletedManyObjects'
      | 'deletedQuestions'
      | 'deletedReactions'
      | 'deletedReviews'
      | 'updatedAnswers'
      | 'updatedManyObjects'
      | 'updatedQuestions'
      | 'updatedReactions'
      | 'updatedReviews'
    > & {
      createdAnswers: Array<ResolversTypes['Answer']>;
      createdManyObjects: Array<ResolversTypes['SomeObject']>;
      createdQuestions: Array<ResolversTypes['Question']>;
      createdReactions: Array<ResolversTypes['Reaction']>;
      createdReviews: Array<ResolversTypes['Review']>;
      deletedAnotherObjects: Array<ResolversTypes['AnotherObject']>;
      deletedAnswers: Array<ResolversTypes['Answer']>;
      deletedManyObjects: Array<ResolversTypes['SomeObject']>;
      deletedQuestions: Array<ResolversTypes['Question']>;
      deletedReactions: Array<ResolversTypes['Reaction']>;
      deletedReviews: Array<ResolversTypes['Review']>;
      updatedAnswers: Array<ResolversTypes['Answer']>;
      updatedManyObjects: Array<ResolversTypes['SomeObject']>;
      updatedQuestions: Array<ResolversTypes['Question']>;
      updatedReactions: Array<ResolversTypes['Reaction']>;
      updatedReviews: Array<ResolversTypes['Review']>;
    }
  >;
  UserSubWhere: UserSubWhere;
  UserWhere: UserWhere;
  UserWhereLookup: UserWhereLookup;
  UserWhereUnique: UserWhereUnique;
};

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = {
  AnotherObject: Omit<AnotherObject, 'deletedBy' | 'manyObjects' | 'myself' | 'self'> & {
    deletedBy?: Maybe<ResolversParentTypes['User']>;
    manyObjects: Array<ResolversParentTypes['SomeObject']>;
    myself?: Maybe<ResolversParentTypes['AnotherObject']>;
    self?: Maybe<ResolversParentTypes['AnotherObject']>;
  };
  AnotherObjectOrderBy: AnotherObjectOrderBy;
  AnotherObjectSubWhere: AnotherObjectSubWhere;
  AnotherObjectWhere: AnotherObjectWhere;
  AnotherObjectWhereLookup: AnotherObjectWhereLookup;
  AnotherObjectWhereUnique: AnotherObjectWhereUnique;
  Answer: Omit<
    Answer,
    | 'childAnswers'
    | 'childQuestions'
    | 'childReactions'
    | 'childReviews'
    | 'createdBy'
    | 'deletedBy'
    | 'parent'
    | 'updatedBy'
  > & {
    childAnswers: Array<ResolversParentTypes['Answer']>;
    childQuestions: Array<ResolversParentTypes['Question']>;
    childReactions: Array<ResolversParentTypes['Reaction']>;
    childReviews: Array<ResolversParentTypes['Review']>;
    createdBy: ResolversParentTypes['User'];
    deletedBy?: Maybe<ResolversParentTypes['User']>;
    parent?: Maybe<ResolversParentTypes['Reaction']>;
    updatedBy: ResolversParentTypes['User'];
  };
  AnswerOrderBy: AnswerOrderBy;
  AnswerSubWhere: AnswerSubWhere;
  AnswerWhere: AnswerWhere;
  AnswerWhereLookup: AnswerWhereLookup;
  AnswerWhereUnique: AnswerWhereUnique;
  Bird: ResolversUnionTypes<ResolversParentTypes>['Bird'];
  Boolean: Scalars['Boolean']['output'];
  CreateAnswer: CreateAnswer;
  CreateQuestion: CreateQuestion;
  CreateReview: CreateReview;
  CreateSomeObject: CreateSomeObject;
  DateTime: Scalars['DateTime']['output'];
  Duck: Duck;
  Eagle: Eagle;
  Float: Scalars['Float']['output'];
  ID: Scalars['ID']['output'];
  Int: Scalars['Int']['output'];
  Mutation: Record<PropertyKey, never>;
  Query: Record<PropertyKey, never>;
  Question: Omit<
    Question,
    | 'childAnswers'
    | 'childQuestions'
    | 'childReactions'
    | 'childReviews'
    | 'createdBy'
    | 'deletedBy'
    | 'parent'
    | 'updatedBy'
  > & {
    childAnswers: Array<ResolversParentTypes['Answer']>;
    childQuestions: Array<ResolversParentTypes['Question']>;
    childReactions: Array<ResolversParentTypes['Reaction']>;
    childReviews: Array<ResolversParentTypes['Review']>;
    createdBy: ResolversParentTypes['User'];
    deletedBy?: Maybe<ResolversParentTypes['User']>;
    parent?: Maybe<ResolversParentTypes['Reaction']>;
    updatedBy: ResolversParentTypes['User'];
  };
  QuestionOrderBy: QuestionOrderBy;
  QuestionSubWhere: QuestionSubWhere;
  QuestionWhere: QuestionWhere;
  QuestionWhereLookup: QuestionWhereLookup;
  QuestionWhereUnique: QuestionWhereUnique;
  Reaction: ResolversInterfaceTypes<ResolversParentTypes>['Reaction'];
  ReactionOrderBy: ReactionOrderBy;
  ReactionSubWhere: ReactionSubWhere;
  ReactionWhere: ReactionWhere;
  ReactionWhereLookup: ReactionWhereLookup;
  ReactionWhereUnique: ReactionWhereUnique;
  Review: Omit<
    Review,
    | 'childAnswers'
    | 'childQuestions'
    | 'childReactions'
    | 'childReviews'
    | 'createdBy'
    | 'deletedBy'
    | 'parent'
    | 'updatedBy'
  > & {
    childAnswers: Array<ResolversParentTypes['Answer']>;
    childQuestions: Array<ResolversParentTypes['Question']>;
    childReactions: Array<ResolversParentTypes['Reaction']>;
    childReviews: Array<ResolversParentTypes['Review']>;
    createdBy: ResolversParentTypes['User'];
    deletedBy?: Maybe<ResolversParentTypes['User']>;
    parent?: Maybe<ResolversParentTypes['Reaction']>;
    updatedBy: ResolversParentTypes['User'];
  };
  ReviewOrderBy: ReviewOrderBy;
  ReviewSubWhere: ReviewSubWhere;
  ReviewWhere: ReviewWhere;
  ReviewWhereLookup: ReviewWhereLookup;
  ReviewWhereUnique: ReviewWhereUnique;
  SomeObject: Omit<SomeObject, 'another' | 'createdBy' | 'deletedBy' | 'updatedBy'> & {
    another?: Maybe<ResolversParentTypes['AnotherObject']>;
    createdBy: ResolversParentTypes['User'];
    deletedBy?: Maybe<ResolversParentTypes['User']>;
    updatedBy: ResolversParentTypes['User'];
  };
  SomeObjectOrderBy: SomeObjectOrderBy;
  SomeObjectSubWhere: SomeObjectSubWhere;
  SomeObjectWhere: SomeObjectWhere;
  SomeObjectWhereLookup: SomeObjectWhereLookup;
  SomeObjectWhereUnique: SomeObjectWhereUnique;
  SomeRawObject: SomeRawObject;
  String: Scalars['String']['output'];
  Time: Scalars['Time']['output'];
  UpdateAnswer: UpdateAnswer;
  UpdateQuestion: UpdateQuestion;
  UpdateReview: UpdateReview;
  UpdateSomeObject: UpdateSomeObject;
  Upload: Scalars['Upload']['output'];
  User: Omit<
    User,
    | 'createdAnswers'
    | 'createdManyObjects'
    | 'createdQuestions'
    | 'createdReactions'
    | 'createdReviews'
    | 'deletedAnotherObjects'
    | 'deletedAnswers'
    | 'deletedManyObjects'
    | 'deletedQuestions'
    | 'deletedReactions'
    | 'deletedReviews'
    | 'updatedAnswers'
    | 'updatedManyObjects'
    | 'updatedQuestions'
    | 'updatedReactions'
    | 'updatedReviews'
  > & {
    createdAnswers: Array<ResolversParentTypes['Answer']>;
    createdManyObjects: Array<ResolversParentTypes['SomeObject']>;
    createdQuestions: Array<ResolversParentTypes['Question']>;
    createdReactions: Array<ResolversParentTypes['Reaction']>;
    createdReviews: Array<ResolversParentTypes['Review']>;
    deletedAnotherObjects: Array<ResolversParentTypes['AnotherObject']>;
    deletedAnswers: Array<ResolversParentTypes['Answer']>;
    deletedManyObjects: Array<ResolversParentTypes['SomeObject']>;
    deletedQuestions: Array<ResolversParentTypes['Question']>;
    deletedReactions: Array<ResolversParentTypes['Reaction']>;
    deletedReviews: Array<ResolversParentTypes['Review']>;
    updatedAnswers: Array<ResolversParentTypes['Answer']>;
    updatedManyObjects: Array<ResolversParentTypes['SomeObject']>;
    updatedQuestions: Array<ResolversParentTypes['Question']>;
    updatedReactions: Array<ResolversParentTypes['Reaction']>;
    updatedReviews: Array<ResolversParentTypes['Review']>;
  };
  UserSubWhere: UserSubWhere;
  UserWhere: UserWhere;
  UserWhereLookup: UserWhereLookup;
  UserWhereUnique: UserWhereUnique;
};

export type AnotherObjectResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['AnotherObject'] = ResolversParentTypes['AnotherObject'],
> = {
  deleteRootId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  deleteRootType?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  deleted?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  deletedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  deletedBy?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  manyObjects?: Resolver<
    Array<ResolversTypes['SomeObject']>,
    ParentType,
    ContextType,
    RequireFields<AnotherObjectManyObjectsArgs, 'deleted'>
  >;
  myself?: Resolver<Maybe<ResolversTypes['AnotherObject']>, ParentType, ContextType>;
  name?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  self?: Resolver<
    Maybe<ResolversTypes['AnotherObject']>,
    ParentType,
    ContextType,
    RequireFields<AnotherObjectSelfArgs, 'deleted'>
  >;
};

export type AnswerResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['Answer'] = ResolversParentTypes['Answer'],
> = {
  childAnswers?: Resolver<
    Array<ResolversTypes['Answer']>,
    ParentType,
    ContextType,
    RequireFields<AnswerChildAnswersArgs, 'deleted'>
  >;
  childQuestions?: Resolver<
    Array<ResolversTypes['Question']>,
    ParentType,
    ContextType,
    RequireFields<AnswerChildQuestionsArgs, 'deleted'>
  >;
  childReactions?: Resolver<
    Array<ResolversTypes['Reaction']>,
    ParentType,
    ContextType,
    RequireFields<AnswerChildReactionsArgs, 'deleted'>
  >;
  childReviews?: Resolver<
    Array<ResolversTypes['Review']>,
    ParentType,
    ContextType,
    RequireFields<AnswerChildReviewsArgs, 'deleted'>
  >;
  content?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  createdBy?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  deleteRootId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  deleteRootType?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  deleted?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  deletedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  deletedBy?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  parent?: Resolver<Maybe<ResolversTypes['Reaction']>, ParentType, ContextType>;
  type?: Resolver<ResolversTypes['ReactionType'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  updatedBy?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type BirdResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['Bird'] = ResolversParentTypes['Bird'],
> = {
  __resolveType: TypeResolveFn<'Duck' | 'Eagle', ParentType, ContextType>;
};

export interface DateTimeScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['DateTime'], any> {
  name: 'DateTime';
}

export type DuckResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['Duck'] = ResolversParentTypes['Duck'],
> = {
  name?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type EagleResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['Eagle'] = ResolversParentTypes['Eagle'],
> = {
  name?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type MutationResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation'],
> = {
  createAnswer?: Resolver<
    ResolversTypes['Answer'],
    ParentType,
    ContextType,
    RequireFields<MutationCreateAnswerArgs, 'data'>
  >;
  createQuestion?: Resolver<
    ResolversTypes['Question'],
    ParentType,
    ContextType,
    RequireFields<MutationCreateQuestionArgs, 'data'>
  >;
  createReview?: Resolver<
    ResolversTypes['Review'],
    ParentType,
    ContextType,
    RequireFields<MutationCreateReviewArgs, 'data'>
  >;
  createSomeObject?: Resolver<
    ResolversTypes['SomeObject'],
    ParentType,
    ContextType,
    RequireFields<MutationCreateSomeObjectArgs, 'data'>
  >;
  deleteAnotherObject?: Resolver<
    ResolversTypes['ID'],
    ParentType,
    ContextType,
    RequireFields<MutationDeleteAnotherObjectArgs, 'where'>
  >;
  deleteAnswer?: Resolver<ResolversTypes['ID'], ParentType, ContextType, RequireFields<MutationDeleteAnswerArgs, 'where'>>;
  deleteQuestion?: Resolver<
    ResolversTypes['ID'],
    ParentType,
    ContextType,
    RequireFields<MutationDeleteQuestionArgs, 'where'>
  >;
  deleteReview?: Resolver<ResolversTypes['ID'], ParentType, ContextType, RequireFields<MutationDeleteReviewArgs, 'where'>>;
  deleteSomeObject?: Resolver<
    ResolversTypes['ID'],
    ParentType,
    ContextType,
    RequireFields<MutationDeleteSomeObjectArgs, 'where'>
  >;
  restoreAnotherObject?: Resolver<
    ResolversTypes['ID'],
    ParentType,
    ContextType,
    RequireFields<MutationRestoreAnotherObjectArgs, 'where'>
  >;
  restoreAnswer?: Resolver<ResolversTypes['ID'], ParentType, ContextType, RequireFields<MutationRestoreAnswerArgs, 'where'>>;
  restoreQuestion?: Resolver<
    ResolversTypes['ID'],
    ParentType,
    ContextType,
    RequireFields<MutationRestoreQuestionArgs, 'where'>
  >;
  restoreReview?: Resolver<ResolversTypes['ID'], ParentType, ContextType, RequireFields<MutationRestoreReviewArgs, 'where'>>;
  restoreSomeObject?: Resolver<
    ResolversTypes['ID'],
    ParentType,
    ContextType,
    RequireFields<MutationRestoreSomeObjectArgs, 'where'>
  >;
  updateAnswer?: Resolver<
    ResolversTypes['Answer'],
    ParentType,
    ContextType,
    RequireFields<MutationUpdateAnswerArgs, 'data' | 'where'>
  >;
  updateQuestion?: Resolver<
    ResolversTypes['Question'],
    ParentType,
    ContextType,
    RequireFields<MutationUpdateQuestionArgs, 'data' | 'where'>
  >;
  updateReview?: Resolver<
    ResolversTypes['Review'],
    ParentType,
    ContextType,
    RequireFields<MutationUpdateReviewArgs, 'data' | 'where'>
  >;
  updateSomeObject?: Resolver<
    ResolversTypes['SomeObject'],
    ParentType,
    ContextType,
    RequireFields<MutationUpdateSomeObjectArgs, 'data' | 'where'>
  >;
};

export type QueryResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query'],
> = {
  anotherObjects?: Resolver<
    Array<ResolversTypes['AnotherObject']>,
    ParentType,
    ContextType,
    RequireFields<QueryAnotherObjectsArgs, 'deleted'>
  >;
  answer?: Resolver<ResolversTypes['Answer'], ParentType, ContextType, RequireFields<QueryAnswerArgs, 'deleted' | 'where'>>;
  answers?: Resolver<Array<ResolversTypes['Answer']>, ParentType, ContextType, RequireFields<QueryAnswersArgs, 'deleted'>>;
  birds?: Resolver<Array<ResolversTypes['Bird']>, ParentType, ContextType>;
  manyObjects?: Resolver<
    Array<ResolversTypes['SomeObject']>,
    ParentType,
    ContextType,
    RequireFields<QueryManyObjectsArgs, 'deleted'>
  >;
  me?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  question?: Resolver<
    ResolversTypes['Question'],
    ParentType,
    ContextType,
    RequireFields<QueryQuestionArgs, 'deleted' | 'where'>
  >;
  questions?: Resolver<
    Array<ResolversTypes['Question']>,
    ParentType,
    ContextType,
    RequireFields<QueryQuestionsArgs, 'deleted'>
  >;
  reaction?: Resolver<
    ResolversTypes['Reaction'],
    ParentType,
    ContextType,
    RequireFields<QueryReactionArgs, 'deleted' | 'where'>
  >;
  reactions?: Resolver<
    Array<ResolversTypes['Reaction']>,
    ParentType,
    ContextType,
    RequireFields<QueryReactionsArgs, 'deleted'>
  >;
  review?: Resolver<ResolversTypes['Review'], ParentType, ContextType, RequireFields<QueryReviewArgs, 'deleted' | 'where'>>;
  reviews?: Resolver<Array<ResolversTypes['Review']>, ParentType, ContextType, RequireFields<QueryReviewsArgs, 'deleted'>>;
  someObject?: Resolver<
    ResolversTypes['SomeObject'],
    ParentType,
    ContextType,
    RequireFields<QuerySomeObjectArgs, 'deleted' | 'where'>
  >;
};

export type QuestionResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['Question'] = ResolversParentTypes['Question'],
> = {
  childAnswers?: Resolver<
    Array<ResolversTypes['Answer']>,
    ParentType,
    ContextType,
    RequireFields<QuestionChildAnswersArgs, 'deleted'>
  >;
  childQuestions?: Resolver<
    Array<ResolversTypes['Question']>,
    ParentType,
    ContextType,
    RequireFields<QuestionChildQuestionsArgs, 'deleted'>
  >;
  childReactions?: Resolver<
    Array<ResolversTypes['Reaction']>,
    ParentType,
    ContextType,
    RequireFields<QuestionChildReactionsArgs, 'deleted'>
  >;
  childReviews?: Resolver<
    Array<ResolversTypes['Review']>,
    ParentType,
    ContextType,
    RequireFields<QuestionChildReviewsArgs, 'deleted'>
  >;
  content?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  createdBy?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  deleteRootId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  deleteRootType?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  deleted?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  deletedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  deletedBy?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  parent?: Resolver<Maybe<ResolversTypes['Reaction']>, ParentType, ContextType>;
  type?: Resolver<ResolversTypes['ReactionType'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  updatedBy?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ReactionResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['Reaction'] = ResolversParentTypes['Reaction'],
> = {
  __resolveType: TypeResolveFn<'Answer' | 'Question' | 'Review', ParentType, ContextType>;
};

export type ReviewResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['Review'] = ResolversParentTypes['Review'],
> = {
  childAnswers?: Resolver<
    Array<ResolversTypes['Answer']>,
    ParentType,
    ContextType,
    RequireFields<ReviewChildAnswersArgs, 'deleted'>
  >;
  childQuestions?: Resolver<
    Array<ResolversTypes['Question']>,
    ParentType,
    ContextType,
    RequireFields<ReviewChildQuestionsArgs, 'deleted'>
  >;
  childReactions?: Resolver<
    Array<ResolversTypes['Reaction']>,
    ParentType,
    ContextType,
    RequireFields<ReviewChildReactionsArgs, 'deleted'>
  >;
  childReviews?: Resolver<
    Array<ResolversTypes['Review']>,
    ParentType,
    ContextType,
    RequireFields<ReviewChildReviewsArgs, 'deleted'>
  >;
  content?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  createdBy?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  deleteRootId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  deleteRootType?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  deleted?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  deletedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  deletedBy?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  parent?: Resolver<Maybe<ResolversTypes['Reaction']>, ParentType, ContextType>;
  rating?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  type?: Resolver<ResolversTypes['ReactionType'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  updatedBy?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type SomeObjectResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['SomeObject'] = ResolversParentTypes['SomeObject'],
> = {
  another?: Resolver<Maybe<ResolversTypes['AnotherObject']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  createdBy?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  deleteRootId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  deleteRootType?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  deleted?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  deletedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  deletedBy?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  field?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  float?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  list?: Resolver<Array<ResolversTypes['SomeEnum']>, ParentType, ContextType, Partial<SomeObjectListArgs>>;
  time?: Resolver<Maybe<ResolversTypes['Time']>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  updatedBy?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  xyz?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
};

export type SomeRawObjectResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['SomeRawObject'] = ResolversParentTypes['SomeRawObject'],
> = {
  field?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
};

export interface TimeScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['Time'], any> {
  name: 'Time';
}

export interface UploadScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['Upload'], any> {
  name: 'Upload';
}

export type UserResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['User'] = ResolversParentTypes['User'],
> = {
  createdAnswers?: Resolver<
    Array<ResolversTypes['Answer']>,
    ParentType,
    ContextType,
    RequireFields<UserCreatedAnswersArgs, 'deleted'>
  >;
  createdManyObjects?: Resolver<
    Array<ResolversTypes['SomeObject']>,
    ParentType,
    ContextType,
    RequireFields<UserCreatedManyObjectsArgs, 'deleted'>
  >;
  createdQuestions?: Resolver<
    Array<ResolversTypes['Question']>,
    ParentType,
    ContextType,
    RequireFields<UserCreatedQuestionsArgs, 'deleted'>
  >;
  createdReactions?: Resolver<
    Array<ResolversTypes['Reaction']>,
    ParentType,
    ContextType,
    RequireFields<UserCreatedReactionsArgs, 'deleted'>
  >;
  createdReviews?: Resolver<
    Array<ResolversTypes['Review']>,
    ParentType,
    ContextType,
    RequireFields<UserCreatedReviewsArgs, 'deleted'>
  >;
  deletedAnotherObjects?: Resolver<
    Array<ResolversTypes['AnotherObject']>,
    ParentType,
    ContextType,
    RequireFields<UserDeletedAnotherObjectsArgs, 'deleted'>
  >;
  deletedAnswers?: Resolver<
    Array<ResolversTypes['Answer']>,
    ParentType,
    ContextType,
    RequireFields<UserDeletedAnswersArgs, 'deleted'>
  >;
  deletedManyObjects?: Resolver<
    Array<ResolversTypes['SomeObject']>,
    ParentType,
    ContextType,
    RequireFields<UserDeletedManyObjectsArgs, 'deleted'>
  >;
  deletedQuestions?: Resolver<
    Array<ResolversTypes['Question']>,
    ParentType,
    ContextType,
    RequireFields<UserDeletedQuestionsArgs, 'deleted'>
  >;
  deletedReactions?: Resolver<
    Array<ResolversTypes['Reaction']>,
    ParentType,
    ContextType,
    RequireFields<UserDeletedReactionsArgs, 'deleted'>
  >;
  deletedReviews?: Resolver<
    Array<ResolversTypes['Review']>,
    ParentType,
    ContextType,
    RequireFields<UserDeletedReviewsArgs, 'deleted'>
  >;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  role?: Resolver<ResolversTypes['Role'], ParentType, ContextType>;
  updatedAnswers?: Resolver<
    Array<ResolversTypes['Answer']>,
    ParentType,
    ContextType,
    RequireFields<UserUpdatedAnswersArgs, 'deleted'>
  >;
  updatedManyObjects?: Resolver<
    Array<ResolversTypes['SomeObject']>,
    ParentType,
    ContextType,
    RequireFields<UserUpdatedManyObjectsArgs, 'deleted'>
  >;
  updatedQuestions?: Resolver<
    Array<ResolversTypes['Question']>,
    ParentType,
    ContextType,
    RequireFields<UserUpdatedQuestionsArgs, 'deleted'>
  >;
  updatedReactions?: Resolver<
    Array<ResolversTypes['Reaction']>,
    ParentType,
    ContextType,
    RequireFields<UserUpdatedReactionsArgs, 'deleted'>
  >;
  updatedReviews?: Resolver<
    Array<ResolversTypes['Review']>,
    ParentType,
    ContextType,
    RequireFields<UserUpdatedReviewsArgs, 'deleted'>
  >;
  username?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
};

export type Resolvers<ContextType = any> = {
  AnotherObject?: AnotherObjectResolvers<ContextType>;
  Answer?: AnswerResolvers<ContextType>;
  Bird?: BirdResolvers<ContextType>;
  DateTime?: GraphQLScalarType;
  Duck?: DuckResolvers<ContextType>;
  Eagle?: EagleResolvers<ContextType>;
  Mutation?: MutationResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  Question?: QuestionResolvers<ContextType>;
  Reaction?: ReactionResolvers<ContextType>;
  Review?: ReviewResolvers<ContextType>;
  SomeObject?: SomeObjectResolvers<ContextType>;
  SomeRawObject?: SomeRawObjectResolvers<ContextType>;
  Time?: GraphQLScalarType;
  Upload?: GraphQLScalarType;
  User?: UserResolvers<ContextType>;
};
