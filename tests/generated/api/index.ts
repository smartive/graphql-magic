import { GraphQLResolveInfo, GraphQLScalarType, GraphQLScalarTypeConfig } from 'graphql';
import { DateTime } from 'luxon';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
export type RequireFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  DateTime: { input: DateTime; output: DateTime; }
  Upload: { input: any; output: any; }
};

export type AnotherObject = {
  __typename?: 'AnotherObject';
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
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<SomeObjectOrderBy>>;
  search?: InputMaybe<Scalars['String']['input']>;
  where?: InputMaybe<SomeObjectWhere>;
};


export type AnotherObjectSelfArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<AnotherObjectOrderBy>>;
  where?: InputMaybe<AnotherObjectWhere>;
};

export type AnotherObjectOrderBy = {
  deletedAt?: InputMaybe<Order>;
  name?: InputMaybe<Order>;
};

export type AnotherObjectWhere = {
  AND?: InputMaybe<Array<AnotherObjectWhere>>;
  NOT?: InputMaybe<AnotherObjectWhere>;
  OR?: InputMaybe<Array<AnotherObjectWhere>>;
  deleted?: InputMaybe<Array<Scalars['Boolean']['input']>>;
  id?: InputMaybe<Array<Scalars['ID']['input']>>;
  manyObjects_NONE?: InputMaybe<SomeObjectWhere>;
  manyObjects_SOME?: InputMaybe<SomeObjectWhere>;
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
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<AnswerOrderBy>>;
  where?: InputMaybe<AnswerWhere>;
};


export type AnswerChildQuestionsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<QuestionOrderBy>>;
  where?: InputMaybe<QuestionWhere>;
};


export type AnswerChildReactionsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<ReactionOrderBy>>;
  where?: InputMaybe<ReactionWhere>;
};


export type AnswerChildReviewsArgs = {
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

export type AnswerWhere = {
  AND?: InputMaybe<Array<AnswerWhere>>;
  NOT?: InputMaybe<AnswerWhere>;
  OR?: InputMaybe<Array<AnswerWhere>>;
  deleted?: InputMaybe<Array<Scalars['Boolean']['input']>>;
  id?: InputMaybe<Array<Scalars['ID']['input']>>;
};

export type AnswerWhereUnique = {
  id?: InputMaybe<Scalars['ID']['input']>;
};

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
  xyz: Scalars['Int']['input'];
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
  Desc = 'DESC'
}

export type Query = {
  __typename?: 'Query';
  anotherObjects: Array<AnotherObject>;
  answer: Answer;
  answers: Array<Answer>;
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
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<AnotherObjectOrderBy>>;
  where?: InputMaybe<AnotherObjectWhere>;
};


export type QueryAnswerArgs = {
  where: AnswerWhereUnique;
};


export type QueryAnswersArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<AnswerOrderBy>>;
  where?: InputMaybe<AnswerWhere>;
};


export type QueryManyObjectsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<SomeObjectOrderBy>>;
  search?: InputMaybe<Scalars['String']['input']>;
  where?: InputMaybe<SomeObjectWhere>;
};


export type QueryQuestionArgs = {
  where: QuestionWhereUnique;
};


export type QueryQuestionsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<QuestionOrderBy>>;
  where?: InputMaybe<QuestionWhere>;
};


export type QueryReactionArgs = {
  where: ReactionWhereUnique;
};


export type QueryReactionsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<ReactionOrderBy>>;
  where?: InputMaybe<ReactionWhere>;
};


export type QueryReviewArgs = {
  where: ReviewWhereUnique;
};


export type QueryReviewsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<ReviewOrderBy>>;
  where?: InputMaybe<ReviewWhere>;
};


export type QuerySomeObjectArgs = {
  where: SomeObjectWhereUnique;
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
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<AnswerOrderBy>>;
  where?: InputMaybe<AnswerWhere>;
};


export type QuestionChildQuestionsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<QuestionOrderBy>>;
  where?: InputMaybe<QuestionWhere>;
};


export type QuestionChildReactionsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<ReactionOrderBy>>;
  where?: InputMaybe<ReactionWhere>;
};


export type QuestionChildReviewsArgs = {
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

export type QuestionWhere = {
  AND?: InputMaybe<Array<QuestionWhere>>;
  NOT?: InputMaybe<QuestionWhere>;
  OR?: InputMaybe<Array<QuestionWhere>>;
  deleted?: InputMaybe<Array<Scalars['Boolean']['input']>>;
  id?: InputMaybe<Array<Scalars['ID']['input']>>;
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
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<AnswerOrderBy>>;
  where?: InputMaybe<AnswerWhere>;
};


export type ReactionChildQuestionsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<QuestionOrderBy>>;
  where?: InputMaybe<QuestionWhere>;
};


export type ReactionChildReactionsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<ReactionOrderBy>>;
  where?: InputMaybe<ReactionWhere>;
};


export type ReactionChildReviewsArgs = {
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

export enum ReactionType {
  Answer = 'Answer',
  Question = 'Question',
  Review = 'Review'
}

export type ReactionWhere = {
  AND?: InputMaybe<Array<ReactionWhere>>;
  NOT?: InputMaybe<ReactionWhere>;
  OR?: InputMaybe<Array<ReactionWhere>>;
  deleted?: InputMaybe<Array<Scalars['Boolean']['input']>>;
  id?: InputMaybe<Array<Scalars['ID']['input']>>;
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
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<AnswerOrderBy>>;
  where?: InputMaybe<AnswerWhere>;
};


export type ReviewChildQuestionsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<QuestionOrderBy>>;
  where?: InputMaybe<QuestionWhere>;
};


export type ReviewChildReactionsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<ReactionOrderBy>>;
  where?: InputMaybe<ReactionWhere>;
};


export type ReviewChildReviewsArgs = {
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

export type ReviewWhere = {
  AND?: InputMaybe<Array<ReviewWhere>>;
  NOT?: InputMaybe<ReviewWhere>;
  OR?: InputMaybe<Array<ReviewWhere>>;
  deleted?: InputMaybe<Array<Scalars['Boolean']['input']>>;
  id?: InputMaybe<Array<Scalars['ID']['input']>>;
  rating_GT?: InputMaybe<Scalars['Float']['input']>;
  rating_GTE?: InputMaybe<Scalars['Float']['input']>;
  rating_LT?: InputMaybe<Scalars['Float']['input']>;
  rating_LTE?: InputMaybe<Scalars['Float']['input']>;
};

export type ReviewWhereUnique = {
  id?: InputMaybe<Scalars['ID']['input']>;
};

export enum Role {
  Admin = 'ADMIN',
  User = 'USER'
}

export enum SomeEnum {
  A = 'A',
  B = 'B',
  C = 'C'
}

export type SomeObject = {
  __typename?: 'SomeObject';
  another?: Maybe<AnotherObject>;
  createdAt: Scalars['DateTime']['output'];
  createdBy: User;
  deleted: Scalars['Boolean']['output'];
  deletedAt?: Maybe<Scalars['DateTime']['output']>;
  deletedBy?: Maybe<User>;
  field?: Maybe<Scalars['String']['output']>;
  float: Scalars['Float']['output'];
  id: Scalars['ID']['output'];
  list: Array<SomeEnum>;
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

export type SomeObjectWhere = {
  AND?: InputMaybe<Array<SomeObjectWhere>>;
  NOT?: InputMaybe<SomeObjectWhere>;
  OR?: InputMaybe<Array<SomeObjectWhere>>;
  another?: InputMaybe<AnotherObjectWhere>;
  deleted?: InputMaybe<Array<Scalars['Boolean']['input']>>;
  field?: InputMaybe<Array<Scalars['String']['input']>>;
  float?: InputMaybe<Array<Scalars['Float']['input']>>;
  id?: InputMaybe<Array<Scalars['ID']['input']>>;
  xyz?: InputMaybe<Array<Scalars['Int']['input']>>;
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
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<AnswerOrderBy>>;
  where?: InputMaybe<AnswerWhere>;
};


export type UserCreatedManyObjectsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<SomeObjectOrderBy>>;
  search?: InputMaybe<Scalars['String']['input']>;
  where?: InputMaybe<SomeObjectWhere>;
};


export type UserCreatedQuestionsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<QuestionOrderBy>>;
  where?: InputMaybe<QuestionWhere>;
};


export type UserCreatedReactionsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<ReactionOrderBy>>;
  where?: InputMaybe<ReactionWhere>;
};


export type UserCreatedReviewsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<ReviewOrderBy>>;
  where?: InputMaybe<ReviewWhere>;
};


export type UserDeletedAnotherObjectsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<AnotherObjectOrderBy>>;
  where?: InputMaybe<AnotherObjectWhere>;
};


export type UserDeletedAnswersArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<AnswerOrderBy>>;
  where?: InputMaybe<AnswerWhere>;
};


export type UserDeletedManyObjectsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<SomeObjectOrderBy>>;
  search?: InputMaybe<Scalars['String']['input']>;
  where?: InputMaybe<SomeObjectWhere>;
};


export type UserDeletedQuestionsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<QuestionOrderBy>>;
  where?: InputMaybe<QuestionWhere>;
};


export type UserDeletedReactionsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<ReactionOrderBy>>;
  where?: InputMaybe<ReactionWhere>;
};


export type UserDeletedReviewsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<ReviewOrderBy>>;
  where?: InputMaybe<ReviewWhere>;
};


export type UserUpdatedAnswersArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<AnswerOrderBy>>;
  where?: InputMaybe<AnswerWhere>;
};


export type UserUpdatedManyObjectsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<SomeObjectOrderBy>>;
  search?: InputMaybe<Scalars['String']['input']>;
  where?: InputMaybe<SomeObjectWhere>;
};


export type UserUpdatedQuestionsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<QuestionOrderBy>>;
  where?: InputMaybe<QuestionWhere>;
};


export type UserUpdatedReactionsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<ReactionOrderBy>>;
  where?: InputMaybe<ReactionWhere>;
};


export type UserUpdatedReviewsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<ReviewOrderBy>>;
  where?: InputMaybe<ReviewWhere>;
};

export type UserWhere = {
  AND?: InputMaybe<Array<UserWhere>>;
  NOT?: InputMaybe<UserWhere>;
  OR?: InputMaybe<Array<UserWhere>>;
  id?: InputMaybe<Array<Scalars['ID']['input']>>;
};

export type UserWhereUnique = {
  id?: InputMaybe<Scalars['ID']['input']>;
};



export type ResolverTypeWrapper<T> = Promise<T> | T;


export type ResolverWithResolve<TResult, TParent, TContext, TArgs> = {
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};
export type Resolver<TResult, TParent = {}, TContext = {}, TArgs = {}> = ResolverFn<TResult, TParent, TContext, TArgs> | ResolverWithResolve<TResult, TParent, TContext, TArgs>;

export type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => Promise<TResult> | TResult;

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => AsyncIterable<TResult> | Promise<AsyncIterable<TResult>>;

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
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

export type SubscriptionResolver<TResult, TKey extends string, TParent = {}, TContext = {}, TArgs = {}> =
  | ((...args: any[]) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
  | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>;

export type TypeResolveFn<TTypes, TParent = {}, TContext = {}> = (
  parent: TParent,
  context: TContext,
  info: GraphQLResolveInfo
) => Maybe<TTypes> | Promise<Maybe<TTypes>>;

export type IsTypeOfResolverFn<T = {}, TContext = {}> = (obj: T, context: TContext, info: GraphQLResolveInfo) => boolean | Promise<boolean>;

export type NextResolverFn<T> = () => Promise<T>;

export type DirectiveResolverFn<TResult = {}, TParent = {}, TContext = {}, TArgs = {}> = (
  next: NextResolverFn<TResult>,
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;


/** Mapping of interface types */
export type ResolversInterfaceTypes<RefType extends Record<string, unknown>> = {
  Reaction: ( Answer ) | ( Question ) | ( Review );
};

/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = {
  AnotherObject: ResolverTypeWrapper<AnotherObject>;
  AnotherObjectOrderBy: AnotherObjectOrderBy;
  AnotherObjectWhere: AnotherObjectWhere;
  AnotherObjectWhereUnique: AnotherObjectWhereUnique;
  Answer: ResolverTypeWrapper<Answer>;
  AnswerOrderBy: AnswerOrderBy;
  AnswerWhere: AnswerWhere;
  AnswerWhereUnique: AnswerWhereUnique;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  CreateAnswer: CreateAnswer;
  CreateQuestion: CreateQuestion;
  CreateReview: CreateReview;
  CreateSomeObject: CreateSomeObject;
  DateTime: ResolverTypeWrapper<Scalars['DateTime']['output']>;
  Float: ResolverTypeWrapper<Scalars['Float']['output']>;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  Mutation: ResolverTypeWrapper<{}>;
  Order: Order;
  Query: ResolverTypeWrapper<{}>;
  Question: ResolverTypeWrapper<Question>;
  QuestionOrderBy: QuestionOrderBy;
  QuestionWhere: QuestionWhere;
  QuestionWhereUnique: QuestionWhereUnique;
  Reaction: ResolverTypeWrapper<ResolversInterfaceTypes<ResolversTypes>['Reaction']>;
  ReactionOrderBy: ReactionOrderBy;
  ReactionType: ReactionType;
  ReactionWhere: ReactionWhere;
  ReactionWhereUnique: ReactionWhereUnique;
  Review: ResolverTypeWrapper<Review>;
  ReviewOrderBy: ReviewOrderBy;
  ReviewWhere: ReviewWhere;
  ReviewWhereUnique: ReviewWhereUnique;
  Role: Role;
  SomeEnum: SomeEnum;
  SomeObject: ResolverTypeWrapper<SomeObject>;
  SomeObjectOrderBy: SomeObjectOrderBy;
  SomeObjectWhere: SomeObjectWhere;
  SomeObjectWhereUnique: SomeObjectWhereUnique;
  SomeRawObject: ResolverTypeWrapper<SomeRawObject>;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  UpdateAnswer: UpdateAnswer;
  UpdateQuestion: UpdateQuestion;
  UpdateReview: UpdateReview;
  UpdateSomeObject: UpdateSomeObject;
  Upload: ResolverTypeWrapper<Scalars['Upload']['output']>;
  User: ResolverTypeWrapper<User>;
  UserWhere: UserWhere;
  UserWhereUnique: UserWhereUnique;
};

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = {
  AnotherObject: AnotherObject;
  AnotherObjectOrderBy: AnotherObjectOrderBy;
  AnotherObjectWhere: AnotherObjectWhere;
  AnotherObjectWhereUnique: AnotherObjectWhereUnique;
  Answer: Answer;
  AnswerOrderBy: AnswerOrderBy;
  AnswerWhere: AnswerWhere;
  AnswerWhereUnique: AnswerWhereUnique;
  Boolean: Scalars['Boolean']['output'];
  CreateAnswer: CreateAnswer;
  CreateQuestion: CreateQuestion;
  CreateReview: CreateReview;
  CreateSomeObject: CreateSomeObject;
  DateTime: Scalars['DateTime']['output'];
  Float: Scalars['Float']['output'];
  ID: Scalars['ID']['output'];
  Int: Scalars['Int']['output'];
  Mutation: {};
  Query: {};
  Question: Question;
  QuestionOrderBy: QuestionOrderBy;
  QuestionWhere: QuestionWhere;
  QuestionWhereUnique: QuestionWhereUnique;
  Reaction: ResolversInterfaceTypes<ResolversParentTypes>['Reaction'];
  ReactionOrderBy: ReactionOrderBy;
  ReactionWhere: ReactionWhere;
  ReactionWhereUnique: ReactionWhereUnique;
  Review: Review;
  ReviewOrderBy: ReviewOrderBy;
  ReviewWhere: ReviewWhere;
  ReviewWhereUnique: ReviewWhereUnique;
  SomeObject: SomeObject;
  SomeObjectOrderBy: SomeObjectOrderBy;
  SomeObjectWhere: SomeObjectWhere;
  SomeObjectWhereUnique: SomeObjectWhereUnique;
  SomeRawObject: SomeRawObject;
  String: Scalars['String']['output'];
  UpdateAnswer: UpdateAnswer;
  UpdateQuestion: UpdateQuestion;
  UpdateReview: UpdateReview;
  UpdateSomeObject: UpdateSomeObject;
  Upload: Scalars['Upload']['output'];
  User: User;
  UserWhere: UserWhere;
  UserWhereUnique: UserWhereUnique;
};

export type AnotherObjectResolvers<ContextType = any, ParentType extends ResolversParentTypes['AnotherObject'] = ResolversParentTypes['AnotherObject']> = {
  deleted?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  deletedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  deletedBy?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  manyObjects?: Resolver<Array<ResolversTypes['SomeObject']>, ParentType, ContextType, Partial<AnotherObjectManyObjectsArgs>>;
  myself?: Resolver<Maybe<ResolversTypes['AnotherObject']>, ParentType, ContextType>;
  name?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  self?: Resolver<Maybe<ResolversTypes['AnotherObject']>, ParentType, ContextType, Partial<AnotherObjectSelfArgs>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type AnswerResolvers<ContextType = any, ParentType extends ResolversParentTypes['Answer'] = ResolversParentTypes['Answer']> = {
  childAnswers?: Resolver<Array<ResolversTypes['Answer']>, ParentType, ContextType, Partial<AnswerChildAnswersArgs>>;
  childQuestions?: Resolver<Array<ResolversTypes['Question']>, ParentType, ContextType, Partial<AnswerChildQuestionsArgs>>;
  childReactions?: Resolver<Array<ResolversTypes['Reaction']>, ParentType, ContextType, Partial<AnswerChildReactionsArgs>>;
  childReviews?: Resolver<Array<ResolversTypes['Review']>, ParentType, ContextType, Partial<AnswerChildReviewsArgs>>;
  content?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  createdBy?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
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

export interface DateTimeScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['DateTime'], any> {
  name: 'DateTime';
}

export type MutationResolvers<ContextType = any, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = {
  createAnswer?: Resolver<ResolversTypes['Answer'], ParentType, ContextType, RequireFields<MutationCreateAnswerArgs, 'data'>>;
  createQuestion?: Resolver<ResolversTypes['Question'], ParentType, ContextType, RequireFields<MutationCreateQuestionArgs, 'data'>>;
  createReview?: Resolver<ResolversTypes['Review'], ParentType, ContextType, RequireFields<MutationCreateReviewArgs, 'data'>>;
  createSomeObject?: Resolver<ResolversTypes['SomeObject'], ParentType, ContextType, RequireFields<MutationCreateSomeObjectArgs, 'data'>>;
  deleteAnotherObject?: Resolver<ResolversTypes['ID'], ParentType, ContextType, RequireFields<MutationDeleteAnotherObjectArgs, 'where'>>;
  deleteAnswer?: Resolver<ResolversTypes['ID'], ParentType, ContextType, RequireFields<MutationDeleteAnswerArgs, 'where'>>;
  deleteQuestion?: Resolver<ResolversTypes['ID'], ParentType, ContextType, RequireFields<MutationDeleteQuestionArgs, 'where'>>;
  deleteReview?: Resolver<ResolversTypes['ID'], ParentType, ContextType, RequireFields<MutationDeleteReviewArgs, 'where'>>;
  deleteSomeObject?: Resolver<ResolversTypes['ID'], ParentType, ContextType, RequireFields<MutationDeleteSomeObjectArgs, 'where'>>;
  restoreAnotherObject?: Resolver<ResolversTypes['ID'], ParentType, ContextType, RequireFields<MutationRestoreAnotherObjectArgs, 'where'>>;
  restoreAnswer?: Resolver<ResolversTypes['ID'], ParentType, ContextType, RequireFields<MutationRestoreAnswerArgs, 'where'>>;
  restoreQuestion?: Resolver<ResolversTypes['ID'], ParentType, ContextType, RequireFields<MutationRestoreQuestionArgs, 'where'>>;
  restoreReview?: Resolver<ResolversTypes['ID'], ParentType, ContextType, RequireFields<MutationRestoreReviewArgs, 'where'>>;
  restoreSomeObject?: Resolver<ResolversTypes['ID'], ParentType, ContextType, RequireFields<MutationRestoreSomeObjectArgs, 'where'>>;
  updateAnswer?: Resolver<ResolversTypes['Answer'], ParentType, ContextType, RequireFields<MutationUpdateAnswerArgs, 'data' | 'where'>>;
  updateQuestion?: Resolver<ResolversTypes['Question'], ParentType, ContextType, RequireFields<MutationUpdateQuestionArgs, 'data' | 'where'>>;
  updateReview?: Resolver<ResolversTypes['Review'], ParentType, ContextType, RequireFields<MutationUpdateReviewArgs, 'data' | 'where'>>;
  updateSomeObject?: Resolver<ResolversTypes['SomeObject'], ParentType, ContextType, RequireFields<MutationUpdateSomeObjectArgs, 'data' | 'where'>>;
};

export type QueryResolvers<ContextType = any, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = {
  anotherObjects?: Resolver<Array<ResolversTypes['AnotherObject']>, ParentType, ContextType, Partial<QueryAnotherObjectsArgs>>;
  answer?: Resolver<ResolversTypes['Answer'], ParentType, ContextType, RequireFields<QueryAnswerArgs, 'where'>>;
  answers?: Resolver<Array<ResolversTypes['Answer']>, ParentType, ContextType, Partial<QueryAnswersArgs>>;
  manyObjects?: Resolver<Array<ResolversTypes['SomeObject']>, ParentType, ContextType, Partial<QueryManyObjectsArgs>>;
  me?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  question?: Resolver<ResolversTypes['Question'], ParentType, ContextType, RequireFields<QueryQuestionArgs, 'where'>>;
  questions?: Resolver<Array<ResolversTypes['Question']>, ParentType, ContextType, Partial<QueryQuestionsArgs>>;
  reaction?: Resolver<ResolversTypes['Reaction'], ParentType, ContextType, RequireFields<QueryReactionArgs, 'where'>>;
  reactions?: Resolver<Array<ResolversTypes['Reaction']>, ParentType, ContextType, Partial<QueryReactionsArgs>>;
  review?: Resolver<ResolversTypes['Review'], ParentType, ContextType, RequireFields<QueryReviewArgs, 'where'>>;
  reviews?: Resolver<Array<ResolversTypes['Review']>, ParentType, ContextType, Partial<QueryReviewsArgs>>;
  someObject?: Resolver<ResolversTypes['SomeObject'], ParentType, ContextType, RequireFields<QuerySomeObjectArgs, 'where'>>;
};

export type QuestionResolvers<ContextType = any, ParentType extends ResolversParentTypes['Question'] = ResolversParentTypes['Question']> = {
  childAnswers?: Resolver<Array<ResolversTypes['Answer']>, ParentType, ContextType, Partial<QuestionChildAnswersArgs>>;
  childQuestions?: Resolver<Array<ResolversTypes['Question']>, ParentType, ContextType, Partial<QuestionChildQuestionsArgs>>;
  childReactions?: Resolver<Array<ResolversTypes['Reaction']>, ParentType, ContextType, Partial<QuestionChildReactionsArgs>>;
  childReviews?: Resolver<Array<ResolversTypes['Review']>, ParentType, ContextType, Partial<QuestionChildReviewsArgs>>;
  content?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  createdBy?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
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

export type ReactionResolvers<ContextType = any, ParentType extends ResolversParentTypes['Reaction'] = ResolversParentTypes['Reaction']> = {
  __resolveType: TypeResolveFn<'Answer' | 'Question' | 'Review', ParentType, ContextType>;
  childAnswers?: Resolver<Array<ResolversTypes['Answer']>, ParentType, ContextType, Partial<ReactionChildAnswersArgs>>;
  childQuestions?: Resolver<Array<ResolversTypes['Question']>, ParentType, ContextType, Partial<ReactionChildQuestionsArgs>>;
  childReactions?: Resolver<Array<ResolversTypes['Reaction']>, ParentType, ContextType, Partial<ReactionChildReactionsArgs>>;
  childReviews?: Resolver<Array<ResolversTypes['Review']>, ParentType, ContextType, Partial<ReactionChildReviewsArgs>>;
  content?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  createdBy?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  deleted?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  deletedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  deletedBy?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  parent?: Resolver<Maybe<ResolversTypes['Reaction']>, ParentType, ContextType>;
  type?: Resolver<ResolversTypes['ReactionType'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  updatedBy?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
};

export type ReviewResolvers<ContextType = any, ParentType extends ResolversParentTypes['Review'] = ResolversParentTypes['Review']> = {
  childAnswers?: Resolver<Array<ResolversTypes['Answer']>, ParentType, ContextType, Partial<ReviewChildAnswersArgs>>;
  childQuestions?: Resolver<Array<ResolversTypes['Question']>, ParentType, ContextType, Partial<ReviewChildQuestionsArgs>>;
  childReactions?: Resolver<Array<ResolversTypes['Reaction']>, ParentType, ContextType, Partial<ReviewChildReactionsArgs>>;
  childReviews?: Resolver<Array<ResolversTypes['Review']>, ParentType, ContextType, Partial<ReviewChildReviewsArgs>>;
  content?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  createdBy?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
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

export type SomeObjectResolvers<ContextType = any, ParentType extends ResolversParentTypes['SomeObject'] = ResolversParentTypes['SomeObject']> = {
  another?: Resolver<Maybe<ResolversTypes['AnotherObject']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  createdBy?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  deleted?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  deletedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  deletedBy?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  field?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  float?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  list?: Resolver<Array<ResolversTypes['SomeEnum']>, ParentType, ContextType, Partial<SomeObjectListArgs>>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  updatedBy?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  xyz?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type SomeRawObjectResolvers<ContextType = any, ParentType extends ResolversParentTypes['SomeRawObject'] = ResolversParentTypes['SomeRawObject']> = {
  field?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export interface UploadScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['Upload'], any> {
  name: 'Upload';
}

export type UserResolvers<ContextType = any, ParentType extends ResolversParentTypes['User'] = ResolversParentTypes['User']> = {
  createdAnswers?: Resolver<Array<ResolversTypes['Answer']>, ParentType, ContextType, Partial<UserCreatedAnswersArgs>>;
  createdManyObjects?: Resolver<Array<ResolversTypes['SomeObject']>, ParentType, ContextType, Partial<UserCreatedManyObjectsArgs>>;
  createdQuestions?: Resolver<Array<ResolversTypes['Question']>, ParentType, ContextType, Partial<UserCreatedQuestionsArgs>>;
  createdReactions?: Resolver<Array<ResolversTypes['Reaction']>, ParentType, ContextType, Partial<UserCreatedReactionsArgs>>;
  createdReviews?: Resolver<Array<ResolversTypes['Review']>, ParentType, ContextType, Partial<UserCreatedReviewsArgs>>;
  deletedAnotherObjects?: Resolver<Array<ResolversTypes['AnotherObject']>, ParentType, ContextType, Partial<UserDeletedAnotherObjectsArgs>>;
  deletedAnswers?: Resolver<Array<ResolversTypes['Answer']>, ParentType, ContextType, Partial<UserDeletedAnswersArgs>>;
  deletedManyObjects?: Resolver<Array<ResolversTypes['SomeObject']>, ParentType, ContextType, Partial<UserDeletedManyObjectsArgs>>;
  deletedQuestions?: Resolver<Array<ResolversTypes['Question']>, ParentType, ContextType, Partial<UserDeletedQuestionsArgs>>;
  deletedReactions?: Resolver<Array<ResolversTypes['Reaction']>, ParentType, ContextType, Partial<UserDeletedReactionsArgs>>;
  deletedReviews?: Resolver<Array<ResolversTypes['Review']>, ParentType, ContextType, Partial<UserDeletedReviewsArgs>>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  role?: Resolver<ResolversTypes['Role'], ParentType, ContextType>;
  updatedAnswers?: Resolver<Array<ResolversTypes['Answer']>, ParentType, ContextType, Partial<UserUpdatedAnswersArgs>>;
  updatedManyObjects?: Resolver<Array<ResolversTypes['SomeObject']>, ParentType, ContextType, Partial<UserUpdatedManyObjectsArgs>>;
  updatedQuestions?: Resolver<Array<ResolversTypes['Question']>, ParentType, ContextType, Partial<UserUpdatedQuestionsArgs>>;
  updatedReactions?: Resolver<Array<ResolversTypes['Reaction']>, ParentType, ContextType, Partial<UserUpdatedReactionsArgs>>;
  updatedReviews?: Resolver<Array<ResolversTypes['Review']>, ParentType, ContextType, Partial<UserUpdatedReviewsArgs>>;
  username?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type Resolvers<ContextType = any> = {
  AnotherObject?: AnotherObjectResolvers<ContextType>;
  Answer?: AnswerResolvers<ContextType>;
  DateTime?: GraphQLScalarType;
  Mutation?: MutationResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  Question?: QuestionResolvers<ContextType>;
  Reaction?: ReactionResolvers<ContextType>;
  Review?: ReviewResolvers<ContextType>;
  SomeObject?: SomeObjectResolvers<ContextType>;
  SomeRawObject?: SomeRawObjectResolvers<ContextType>;
  Upload?: GraphQLScalarType;
  User?: UserResolvers<ContextType>;
};

