export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string };
  String: { input: string; output: string };
  Boolean: { input: boolean; output: boolean };
  Int: { input: number; output: number };
  Float: { input: number; output: number };
  DateTime: { input: string; output: string };
  Upload: { input: any; output: any };
};

export type AnotherObject = {
  __typename: 'AnotherObject';
  deleted: Scalars['Boolean']['output'];
  deletedAt: Maybe<Scalars['DateTime']['output']>;
  deletedBy: Maybe<User>;
  id: Scalars['ID']['output'];
  manyObjects: Array<SomeObject>;
  myself: Maybe<AnotherObject>;
  name: Maybe<Scalars['String']['output']>;
  self: Maybe<AnotherObject>;
};

export type AnotherObjectmanyObjectsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<SomeObjectOrderBy>>;
  search?: InputMaybe<Scalars['String']['input']>;
  where?: InputMaybe<SomeObjectWhere>;
};

export type AnotherObjectselfArgs = {
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
  __typename: 'Answer';
  childAnswers: Array<Answer>;
  childQuestions: Array<Question>;
  childReactions: Array<Reaction>;
  childReviews: Array<Review>;
  content: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  createdBy: User;
  deleted: Scalars['Boolean']['output'];
  deletedAt: Maybe<Scalars['DateTime']['output']>;
  deletedBy: Maybe<User>;
  id: Scalars['ID']['output'];
  parent: Maybe<Reaction>;
  type: ReactionType;
  updatedAt: Scalars['DateTime']['output'];
  updatedBy: User;
};

export type AnswerchildAnswersArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<AnswerOrderBy>>;
  where?: InputMaybe<AnswerWhere>;
};

export type AnswerchildQuestionsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<QuestionOrderBy>>;
  where?: InputMaybe<QuestionWhere>;
};

export type AnswerchildReactionsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<ReactionOrderBy>>;
  where?: InputMaybe<ReactionWhere>;
};

export type AnswerchildReviewsArgs = {
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
  __typename: 'Mutation';
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

export type MutationcreateAnswerArgs = {
  data: CreateAnswer;
};

export type MutationcreateQuestionArgs = {
  data: CreateQuestion;
};

export type MutationcreateReviewArgs = {
  data: CreateReview;
};

export type MutationcreateSomeObjectArgs = {
  data: CreateSomeObject;
};

export type MutationdeleteAnotherObjectArgs = {
  dryRun?: InputMaybe<Scalars['Boolean']['input']>;
  where: AnotherObjectWhereUnique;
};

export type MutationdeleteAnswerArgs = {
  dryRun?: InputMaybe<Scalars['Boolean']['input']>;
  where: AnswerWhereUnique;
};

export type MutationdeleteQuestionArgs = {
  dryRun?: InputMaybe<Scalars['Boolean']['input']>;
  where: QuestionWhereUnique;
};

export type MutationdeleteReviewArgs = {
  dryRun?: InputMaybe<Scalars['Boolean']['input']>;
  where: ReviewWhereUnique;
};

export type MutationdeleteSomeObjectArgs = {
  dryRun?: InputMaybe<Scalars['Boolean']['input']>;
  where: SomeObjectWhereUnique;
};

export type MutationrestoreAnotherObjectArgs = {
  where: AnotherObjectWhereUnique;
};

export type MutationrestoreAnswerArgs = {
  where: AnswerWhereUnique;
};

export type MutationrestoreQuestionArgs = {
  where: QuestionWhereUnique;
};

export type MutationrestoreReviewArgs = {
  where: ReviewWhereUnique;
};

export type MutationrestoreSomeObjectArgs = {
  where: SomeObjectWhereUnique;
};

export type MutationupdateAnswerArgs = {
  data: UpdateAnswer;
  where: AnswerWhereUnique;
};

export type MutationupdateQuestionArgs = {
  data: UpdateQuestion;
  where: QuestionWhereUnique;
};

export type MutationupdateReviewArgs = {
  data: UpdateReview;
  where: ReviewWhereUnique;
};

export type MutationupdateSomeObjectArgs = {
  data: UpdateSomeObject;
  where: SomeObjectWhereUnique;
};

export enum Order {
  ASC = 'ASC',
  DESC = 'DESC',
}

export type Query = {
  __typename: 'Query';
  anotherObjects: Array<AnotherObject>;
  answer: Answer;
  answers: Array<Answer>;
  manyObjects: Array<SomeObject>;
  me: Maybe<User>;
  question: Question;
  questions: Array<Question>;
  reaction: Reaction;
  reactions: Array<Reaction>;
  review: Review;
  reviews: Array<Review>;
  someObject: SomeObject;
};

export type QueryanotherObjectsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<AnotherObjectOrderBy>>;
  where?: InputMaybe<AnotherObjectWhere>;
};

export type QueryanswerArgs = {
  where: AnswerWhereUnique;
};

export type QueryanswersArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<AnswerOrderBy>>;
  where?: InputMaybe<AnswerWhere>;
};

export type QuerymanyObjectsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<SomeObjectOrderBy>>;
  search?: InputMaybe<Scalars['String']['input']>;
  where?: InputMaybe<SomeObjectWhere>;
};

export type QueryquestionArgs = {
  where: QuestionWhereUnique;
};

export type QueryquestionsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<QuestionOrderBy>>;
  where?: InputMaybe<QuestionWhere>;
};

export type QueryreactionArgs = {
  where: ReactionWhereUnique;
};

export type QueryreactionsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<ReactionOrderBy>>;
  where?: InputMaybe<ReactionWhere>;
};

export type QueryreviewArgs = {
  where: ReviewWhereUnique;
};

export type QueryreviewsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<ReviewOrderBy>>;
  where?: InputMaybe<ReviewWhere>;
};

export type QuerysomeObjectArgs = {
  where: SomeObjectWhereUnique;
};

export type Question = Reaction & {
  __typename: 'Question';
  childAnswers: Array<Answer>;
  childQuestions: Array<Question>;
  childReactions: Array<Reaction>;
  childReviews: Array<Review>;
  content: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  createdBy: User;
  deleted: Scalars['Boolean']['output'];
  deletedAt: Maybe<Scalars['DateTime']['output']>;
  deletedBy: Maybe<User>;
  id: Scalars['ID']['output'];
  parent: Maybe<Reaction>;
  type: ReactionType;
  updatedAt: Scalars['DateTime']['output'];
  updatedBy: User;
};

export type QuestionchildAnswersArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<AnswerOrderBy>>;
  where?: InputMaybe<AnswerWhere>;
};

export type QuestionchildQuestionsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<QuestionOrderBy>>;
  where?: InputMaybe<QuestionWhere>;
};

export type QuestionchildReactionsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<ReactionOrderBy>>;
  where?: InputMaybe<ReactionWhere>;
};

export type QuestionchildReviewsArgs = {
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
  content: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  createdBy: User;
  deleted: Scalars['Boolean']['output'];
  deletedAt: Maybe<Scalars['DateTime']['output']>;
  deletedBy: Maybe<User>;
  id: Scalars['ID']['output'];
  parent: Maybe<Reaction>;
  type: ReactionType;
  updatedAt: Scalars['DateTime']['output'];
  updatedBy: User;
};

export type ReactionchildAnswersArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<AnswerOrderBy>>;
  where?: InputMaybe<AnswerWhere>;
};

export type ReactionchildQuestionsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<QuestionOrderBy>>;
  where?: InputMaybe<QuestionWhere>;
};

export type ReactionchildReactionsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<ReactionOrderBy>>;
  where?: InputMaybe<ReactionWhere>;
};

export type ReactionchildReviewsArgs = {
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
  Review = 'Review',
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
  __typename: 'Review';
  childAnswers: Array<Answer>;
  childQuestions: Array<Question>;
  childReactions: Array<Reaction>;
  childReviews: Array<Review>;
  content: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  createdBy: User;
  deleted: Scalars['Boolean']['output'];
  deletedAt: Maybe<Scalars['DateTime']['output']>;
  deletedBy: Maybe<User>;
  id: Scalars['ID']['output'];
  parent: Maybe<Reaction>;
  rating: Maybe<Scalars['Float']['output']>;
  type: ReactionType;
  updatedAt: Scalars['DateTime']['output'];
  updatedBy: User;
};

export type ReviewchildAnswersArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<AnswerOrderBy>>;
  where?: InputMaybe<AnswerWhere>;
};

export type ReviewchildQuestionsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<QuestionOrderBy>>;
  where?: InputMaybe<QuestionWhere>;
};

export type ReviewchildReactionsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<ReactionOrderBy>>;
  where?: InputMaybe<ReactionWhere>;
};

export type ReviewchildReviewsArgs = {
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
  ADMIN = 'ADMIN',
  USER = 'USER',
}

export enum SomeEnum {
  A = 'A',
  B = 'B',
  C = 'C',
}

export type SomeObject = {
  __typename: 'SomeObject';
  another: AnotherObject;
  createdAt: Scalars['DateTime']['output'];
  createdBy: User;
  deleted: Scalars['Boolean']['output'];
  deletedAt: Maybe<Scalars['DateTime']['output']>;
  deletedBy: Maybe<User>;
  field: Maybe<Scalars['String']['output']>;
  float: Scalars['Float']['output'];
  id: Scalars['ID']['output'];
  list: Array<SomeEnum>;
  updatedAt: Scalars['DateTime']['output'];
  updatedBy: User;
  xyz: Scalars['Int']['output'];
};

export type SomeObjectlistArgs = {
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
  float?: InputMaybe<Array<Scalars['Float']['input']>>;
  id?: InputMaybe<Array<Scalars['ID']['input']>>;
  xyz?: InputMaybe<Array<Scalars['Int']['input']>>;
};

export type SomeObjectWhereUnique = {
  id?: InputMaybe<Scalars['ID']['input']>;
};

export type SomeRawObject = {
  __typename: 'SomeRawObject';
  field: Maybe<Scalars['String']['output']>;
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
  __typename: 'User';
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
  role: Maybe<Role>;
  updatedAnswers: Array<Answer>;
  updatedManyObjects: Array<SomeObject>;
  updatedQuestions: Array<Question>;
  updatedReactions: Array<Reaction>;
  updatedReviews: Array<Review>;
  username: Maybe<Scalars['String']['output']>;
};

export type UsercreatedAnswersArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<AnswerOrderBy>>;
  where?: InputMaybe<AnswerWhere>;
};

export type UsercreatedManyObjectsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<SomeObjectOrderBy>>;
  search?: InputMaybe<Scalars['String']['input']>;
  where?: InputMaybe<SomeObjectWhere>;
};

export type UsercreatedQuestionsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<QuestionOrderBy>>;
  where?: InputMaybe<QuestionWhere>;
};

export type UsercreatedReactionsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<ReactionOrderBy>>;
  where?: InputMaybe<ReactionWhere>;
};

export type UsercreatedReviewsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<ReviewOrderBy>>;
  where?: InputMaybe<ReviewWhere>;
};

export type UserdeletedAnotherObjectsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<AnotherObjectOrderBy>>;
  where?: InputMaybe<AnotherObjectWhere>;
};

export type UserdeletedAnswersArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<AnswerOrderBy>>;
  where?: InputMaybe<AnswerWhere>;
};

export type UserdeletedManyObjectsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<SomeObjectOrderBy>>;
  search?: InputMaybe<Scalars['String']['input']>;
  where?: InputMaybe<SomeObjectWhere>;
};

export type UserdeletedQuestionsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<QuestionOrderBy>>;
  where?: InputMaybe<QuestionWhere>;
};

export type UserdeletedReactionsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<ReactionOrderBy>>;
  where?: InputMaybe<ReactionWhere>;
};

export type UserdeletedReviewsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<ReviewOrderBy>>;
  where?: InputMaybe<ReviewWhere>;
};

export type UserupdatedAnswersArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<AnswerOrderBy>>;
  where?: InputMaybe<AnswerWhere>;
};

export type UserupdatedManyObjectsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<SomeObjectOrderBy>>;
  search?: InputMaybe<Scalars['String']['input']>;
  where?: InputMaybe<SomeObjectWhere>;
};

export type UserupdatedQuestionsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<QuestionOrderBy>>;
  where?: InputMaybe<QuestionWhere>;
};

export type UserupdatedReactionsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<ReactionOrderBy>>;
  where?: InputMaybe<ReactionWhere>;
};

export type UserupdatedReviewsArgs = {
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

export type DeleteAnotherObjectMutationVariables = Exact<{ [key: string]: never }>;

export type DeleteAnotherObjectMutation = { deleteAnotherObject: string };

export type GetAnotherObjectQueryVariables = Exact<{ [key: string]: never }>;

export type GetAnotherObjectQuery = { anotherObjects: Array<{ __typename: 'AnotherObject'; id: string; deleted: boolean }> };

export type GetReactionsQueryVariables = Exact<{ [key: string]: never }>;

export type GetReactionsQuery = {
  reactions: Array<
    | { __typename: 'Answer'; type: ReactionType; content: string | null }
    | { __typename: 'Question'; type: ReactionType; content: string | null }
    | { __typename: 'Review'; rating: number | null; type: ReactionType; content: string | null }
  >;
};

export type GetReactionQueryVariables = Exact<{ [key: string]: never }>;

export type GetReactionQuery = {
  reaction:
    | { __typename: 'Answer'; type: ReactionType; content: string | null }
    | { __typename: 'Question'; type: ReactionType; content: string | null }
    | { __typename: 'Review'; rating: number | null; type: ReactionType; content: string | null };
};

export type GetReviewsQueryVariables = Exact<{ [key: string]: never }>;

export type GetReviewsQuery = {
  reviews: Array<{ __typename: 'Review'; type: ReactionType; content: string | null; rating: number | null }>;
};

export type GetReviewQueryVariables = Exact<{ [key: string]: never }>;

export type GetReviewQuery = {
  review: { __typename: 'Review'; type: ReactionType; content: string | null; rating: number | null };
};

export type CreateReviewMutationVariables = Exact<{
  data: CreateReview;
}>;

export type CreateReviewMutation = { createReview: { __typename: 'Review'; content: string | null; rating: number | null } };

export type UpdateReviewMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  data: UpdateReview;
}>;

export type UpdateReviewMutation = { updateReview: { __typename: 'Review'; content: string | null; rating: number | null } };

export type SomeQueryQueryVariables = Exact<{ [key: string]: never }>;

export type SomeQueryQuery = {
  manyObjects: Array<{
    __typename: 'SomeObject';
    id: string;
    field: string | null;
    xyz: number;
    another: {
      __typename: 'AnotherObject';
      id: string;
      manyObjects: Array<{ __typename: 'SomeObject'; id: string; field: string | null }>;
    };
  }>;
};

export type ReverseFiltersQueryQueryVariables = Exact<{ [key: string]: never }>;

export type ReverseFiltersQueryQuery = {
  all: Array<{ __typename: 'AnotherObject'; id: string; manyObjects: Array<{ __typename: 'SomeObject'; float: number }> }>;
  withFloat0: Array<{
    __typename: 'AnotherObject';
    id: string;
    manyObjects: Array<{ __typename: 'SomeObject'; float: number }>;
  }>;
  withFloat0_5: Array<{
    __typename: 'AnotherObject';
    id: string;
    manyObjects: Array<{ __typename: 'SomeObject'; float: number }>;
  }>;
  noneFloat0: Array<{
    __typename: 'AnotherObject';
    id: string;
    manyObjects: Array<{ __typename: 'SomeObject'; float: number }>;
  }>;
  noneFloat0_5: Array<{
    __typename: 'AnotherObject';
    id: string;
    manyObjects: Array<{ __typename: 'SomeObject'; float: number }>;
  }>;
  noneFloat2: Array<{
    __typename: 'AnotherObject';
    id: string;
    manyObjects: Array<{ __typename: 'SomeObject'; float: number }>;
  }>;
};

export type NotQueryQueryVariables = Exact<{ [key: string]: never }>;

export type NotQueryQuery = { manyObjects: Array<{ __typename: 'SomeObject'; id: string }> };

export type AndQueryQueryVariables = Exact<{ [key: string]: never }>;

export type AndQueryQuery = { manyObjects: Array<{ __typename: 'SomeObject'; id: string }> };

export type OrQueryQueryVariables = Exact<{ [key: string]: never }>;

export type OrQueryQuery = { manyObjects: Array<{ __typename: 'SomeObject'; id: string }> };

export type DeleteAnotherObjectMutationMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;

export type DeleteAnotherObjectMutationMutation = { mutated: string };

export type RestoreAnotherObjectMutationMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;

export type RestoreAnotherObjectMutationMutation = { mutated: string };

export type CreateSomeObjectMutationMutationVariables = Exact<{
  data: CreateSomeObject;
}>;

export type CreateSomeObjectMutationMutation = { mutated: { __typename: 'SomeObject'; id: string } };

export type UpdateSomeObjectMutationMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  data: UpdateSomeObject;
}>;

export type UpdateSomeObjectMutationMutation = { mutated: { __typename: 'SomeObject'; id: string } };

export type DeleteSomeObjectMutationMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;

export type DeleteSomeObjectMutationMutation = { mutated: string };

export type RestoreSomeObjectMutationMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;

export type RestoreSomeObjectMutationMutation = { mutated: string };

export type CreateReviewMutationMutationVariables = Exact<{
  data: CreateReview;
}>;

export type CreateReviewMutationMutation = { mutated: { __typename: 'Review'; id: string } };

export type UpdateReviewMutationMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  data: UpdateReview;
}>;

export type UpdateReviewMutationMutation = { mutated: { __typename: 'Review'; id: string } };

export type DeleteReviewMutationMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;

export type DeleteReviewMutationMutation = { mutated: string };

export type RestoreReviewMutationMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;

export type RestoreReviewMutationMutation = { mutated: string };

export type CreateQuestionMutationMutationVariables = Exact<{
  data: CreateQuestion;
}>;

export type CreateQuestionMutationMutation = { mutated: { __typename: 'Question'; id: string } };

export type UpdateQuestionMutationMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  data: UpdateQuestion;
}>;

export type UpdateQuestionMutationMutation = { mutated: { __typename: 'Question'; id: string } };

export type DeleteQuestionMutationMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;

export type DeleteQuestionMutationMutation = { mutated: string };

export type RestoreQuestionMutationMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;

export type RestoreQuestionMutationMutation = { mutated: string };

export type CreateAnswerMutationMutationVariables = Exact<{
  data: CreateAnswer;
}>;

export type CreateAnswerMutationMutation = { mutated: { __typename: 'Answer'; id: string } };

export type UpdateAnswerMutationMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  data: UpdateAnswer;
}>;

export type UpdateAnswerMutationMutation = { mutated: { __typename: 'Answer'; id: string } };

export type DeleteAnswerMutationMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;

export type DeleteAnswerMutationMutation = { mutated: string };

export type RestoreAnswerMutationMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;

export type RestoreAnswerMutationMutation = { mutated: string };

type DiscriminateUnion<T, U> = T extends U ? T : never;

export namespace DeleteAnotherObject {
  export type Variables = DeleteAnotherObjectMutationVariables;
  export type mutation = DeleteAnotherObjectMutation;
}

export namespace GetAnotherObject {
  export type Variables = GetAnotherObjectQueryVariables;
  export type query = GetAnotherObjectQuery;
  export type anotherObjects = NonNullable<NonNullable<GetAnotherObjectQuery['anotherObjects']>[number]>;
}

export namespace GetReactions {
  export type Variables = GetReactionsQueryVariables;
  export type query = GetReactionsQuery;
  export type reactions = NonNullable<NonNullable<GetReactionsQuery['reactions']>[number]>;
  export type ReviewInlineFragment = DiscriminateUnion<
    NonNullable<NonNullable<GetReactionsQuery['reactions']>[number]>,
    { __typename: 'Review' }
  >;
}

export namespace GetReaction {
  export type Variables = GetReactionQueryVariables;
  export type query = GetReactionQuery;
  export type reaction = NonNullable<GetReactionQuery['reaction']>;
  export type ReviewInlineFragment = DiscriminateUnion<NonNullable<GetReactionQuery['reaction']>, { __typename: 'Review' }>;
}

export namespace GetReviews {
  export type Variables = GetReviewsQueryVariables;
  export type query = GetReviewsQuery;
  export type reviews = NonNullable<NonNullable<GetReviewsQuery['reviews']>[number]>;
}

export namespace GetReview {
  export type Variables = GetReviewQueryVariables;
  export type query = GetReviewQuery;
  export type review = NonNullable<GetReviewQuery['review']>;
}

export namespace CreateReview {
  export type Variables = CreateReviewMutationVariables;
  export type mutation = CreateReviewMutation;
  export type createReview = NonNullable<CreateReviewMutation['createReview']>;
}

export namespace UpdateReview {
  export type Variables = UpdateReviewMutationVariables;
  export type mutation = UpdateReviewMutation;
  export type updateReview = NonNullable<UpdateReviewMutation['updateReview']>;
}

export namespace SomeQuery {
  export type Variables = SomeQueryQueryVariables;
  export type query = SomeQueryQuery;
  export type manyObjects = NonNullable<NonNullable<SomeQueryQuery['manyObjects']>[number]>;
  export type another = NonNullable<NonNullable<NonNullable<SomeQueryQuery['manyObjects']>[number]>['another']>;
  export type _manyObjects = NonNullable<
    NonNullable<
      NonNullable<NonNullable<NonNullable<SomeQueryQuery['manyObjects']>[number]>['another']>['manyObjects']
    >[number]
  >;
}

export namespace ReverseFiltersQuery {
  export type Variables = ReverseFiltersQueryQueryVariables;
  export type query = ReverseFiltersQueryQuery;
  export type all = NonNullable<NonNullable<ReverseFiltersQueryQuery['all']>[number]>;
  export type manyObjects = NonNullable<
    NonNullable<NonNullable<NonNullable<ReverseFiltersQueryQuery['all']>[number]>['manyObjects']>[number]
  >;
  export type withFloat0 = NonNullable<NonNullable<ReverseFiltersQueryQuery['withFloat0']>[number]>;
  export type _manyObjects = NonNullable<
    NonNullable<NonNullable<NonNullable<ReverseFiltersQueryQuery['withFloat0']>[number]>['manyObjects']>[number]
  >;
  export type withFloat0_5 = NonNullable<NonNullable<ReverseFiltersQueryQuery['withFloat0_5']>[number]>;
  export type __manyObjects = NonNullable<
    NonNullable<NonNullable<NonNullable<ReverseFiltersQueryQuery['withFloat0_5']>[number]>['manyObjects']>[number]
  >;
  export type noneFloat0 = NonNullable<NonNullable<ReverseFiltersQueryQuery['noneFloat0']>[number]>;
  export type ___manyObjects = NonNullable<
    NonNullable<NonNullable<NonNullable<ReverseFiltersQueryQuery['noneFloat0']>[number]>['manyObjects']>[number]
  >;
  export type noneFloat0_5 = NonNullable<NonNullable<ReverseFiltersQueryQuery['noneFloat0_5']>[number]>;
  export type ____manyObjects = NonNullable<
    NonNullable<NonNullable<NonNullable<ReverseFiltersQueryQuery['noneFloat0_5']>[number]>['manyObjects']>[number]
  >;
  export type noneFloat2 = NonNullable<NonNullable<ReverseFiltersQueryQuery['noneFloat2']>[number]>;
  export type _____manyObjects = NonNullable<
    NonNullable<NonNullable<NonNullable<ReverseFiltersQueryQuery['noneFloat2']>[number]>['manyObjects']>[number]
  >;
}

export namespace NotQuery {
  export type Variables = NotQueryQueryVariables;
  export type query = NotQueryQuery;
  export type manyObjects = NonNullable<NonNullable<NotQueryQuery['manyObjects']>[number]>;
}

export namespace AndQuery {
  export type Variables = AndQueryQueryVariables;
  export type query = AndQueryQuery;
  export type manyObjects = NonNullable<NonNullable<AndQueryQuery['manyObjects']>[number]>;
}

export namespace OrQuery {
  export type Variables = OrQueryQueryVariables;
  export type query = OrQueryQuery;
  export type manyObjects = NonNullable<NonNullable<OrQueryQuery['manyObjects']>[number]>;
}

export namespace DeleteAnotherObjectMutation {
  export type Variables = DeleteAnotherObjectMutationMutationVariables;
  export type mutation = DeleteAnotherObjectMutationMutation;
}

export namespace RestoreAnotherObjectMutation {
  export type Variables = RestoreAnotherObjectMutationMutationVariables;
  export type mutation = RestoreAnotherObjectMutationMutation;
}

export namespace CreateSomeObjectMutation {
  export type Variables = CreateSomeObjectMutationMutationVariables;
  export type mutation = CreateSomeObjectMutationMutation;
  export type mutated = NonNullable<CreateSomeObjectMutationMutation['mutated']>;
}

export namespace UpdateSomeObjectMutation {
  export type Variables = UpdateSomeObjectMutationMutationVariables;
  export type mutation = UpdateSomeObjectMutationMutation;
  export type mutated = NonNullable<UpdateSomeObjectMutationMutation['mutated']>;
}

export namespace DeleteSomeObjectMutation {
  export type Variables = DeleteSomeObjectMutationMutationVariables;
  export type mutation = DeleteSomeObjectMutationMutation;
}

export namespace RestoreSomeObjectMutation {
  export type Variables = RestoreSomeObjectMutationMutationVariables;
  export type mutation = RestoreSomeObjectMutationMutation;
}

export namespace CreateReviewMutation {
  export type Variables = CreateReviewMutationMutationVariables;
  export type mutation = CreateReviewMutationMutation;
  export type mutated = NonNullable<CreateReviewMutationMutation['mutated']>;
}

export namespace UpdateReviewMutation {
  export type Variables = UpdateReviewMutationMutationVariables;
  export type mutation = UpdateReviewMutationMutation;
  export type mutated = NonNullable<UpdateReviewMutationMutation['mutated']>;
}

export namespace DeleteReviewMutation {
  export type Variables = DeleteReviewMutationMutationVariables;
  export type mutation = DeleteReviewMutationMutation;
}

export namespace RestoreReviewMutation {
  export type Variables = RestoreReviewMutationMutationVariables;
  export type mutation = RestoreReviewMutationMutation;
}

export namespace CreateQuestionMutation {
  export type Variables = CreateQuestionMutationMutationVariables;
  export type mutation = CreateQuestionMutationMutation;
  export type mutated = NonNullable<CreateQuestionMutationMutation['mutated']>;
}

export namespace UpdateQuestionMutation {
  export type Variables = UpdateQuestionMutationMutationVariables;
  export type mutation = UpdateQuestionMutationMutation;
  export type mutated = NonNullable<UpdateQuestionMutationMutation['mutated']>;
}

export namespace DeleteQuestionMutation {
  export type Variables = DeleteQuestionMutationMutationVariables;
  export type mutation = DeleteQuestionMutationMutation;
}

export namespace RestoreQuestionMutation {
  export type Variables = RestoreQuestionMutationMutationVariables;
  export type mutation = RestoreQuestionMutationMutation;
}

export namespace CreateAnswerMutation {
  export type Variables = CreateAnswerMutationMutationVariables;
  export type mutation = CreateAnswerMutationMutation;
  export type mutated = NonNullable<CreateAnswerMutationMutation['mutated']>;
}

export namespace UpdateAnswerMutation {
  export type Variables = UpdateAnswerMutationMutationVariables;
  export type mutation = UpdateAnswerMutationMutation;
  export type mutated = NonNullable<UpdateAnswerMutationMutation['mutated']>;
}

export namespace DeleteAnswerMutation {
  export type Variables = DeleteAnswerMutationMutationVariables;
  export type mutation = DeleteAnswerMutationMutation;
}

export namespace RestoreAnswerMutation {
  export type Variables = RestoreAnswerMutationMutationVariables;
  export type mutation = RestoreAnswerMutationMutation;
}
