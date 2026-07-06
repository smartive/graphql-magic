import type { Time } from '@smartive/graphql-magic';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string };
  String: { input: string; output: string };
  Boolean: { input: boolean; output: boolean };
  Int: { input: number; output: number };
  Float: { input: number; output: number };
  DateTime: { input: string; output: string };
  Time: { input: Time; output: Time };
  Upload: { input: unknown; output: unknown };
};

export type AnotherObject = {
  deleteRootId: Maybe<Scalars['ID']['output']>;
  deleteRootType: Maybe<Scalars['String']['output']>;
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
  deleted?: InputMaybe<Scalars['Boolean']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<SomeObjectOrderBy>>;
  search?: InputMaybe<Scalars['String']['input']>;
  where?: InputMaybe<SomeObjectWhere>;
};

export type AnotherObjectselfArgs = {
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
  childAnswers: Array<Answer>;
  childQuestions: Array<Question>;
  childReactions: Array<Reaction>;
  childReviews: Array<Review>;
  content: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  createdBy: User;
  deleteRootId: Maybe<Scalars['ID']['output']>;
  deleteRootType: Maybe<Scalars['String']['output']>;
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
  deleted?: InputMaybe<Scalars['Boolean']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<AnswerOrderBy>>;
  where?: InputMaybe<AnswerWhere>;
};

export type AnswerchildQuestionsArgs = {
  deleted?: InputMaybe<Scalars['Boolean']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<QuestionOrderBy>>;
  where?: InputMaybe<QuestionWhere>;
};

export type AnswerchildReactionsArgs = {
  deleted?: InputMaybe<Scalars['Boolean']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<ReactionOrderBy>>;
  where?: InputMaybe<ReactionWhere>;
};

export type AnswerchildReviewsArgs = {
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
  name: Maybe<Scalars['String']['output']>;
};

export type Eagle = {
  name: Maybe<Scalars['String']['output']>;
};

export type Mutation = {
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
  anotherObjects: Array<AnotherObject>;
  answer: Answer;
  answers: Array<Answer>;
  birds: Array<Bird>;
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
  deleted?: InputMaybe<Scalars['Boolean']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<AnotherObjectOrderBy>>;
  where?: InputMaybe<AnotherObjectWhere>;
};

export type QueryanswerArgs = {
  deleted?: InputMaybe<Scalars['Boolean']['input']>;
  where: AnswerWhereLookup;
};

export type QueryanswersArgs = {
  deleted?: InputMaybe<Scalars['Boolean']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<AnswerOrderBy>>;
  where?: InputMaybe<AnswerWhere>;
};

export type QuerymanyObjectsArgs = {
  deleted?: InputMaybe<Scalars['Boolean']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<SomeObjectOrderBy>>;
  search?: InputMaybe<Scalars['String']['input']>;
  where?: InputMaybe<SomeObjectWhere>;
};

export type QueryquestionArgs = {
  deleted?: InputMaybe<Scalars['Boolean']['input']>;
  where: QuestionWhereLookup;
};

export type QueryquestionsArgs = {
  deleted?: InputMaybe<Scalars['Boolean']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<QuestionOrderBy>>;
  where?: InputMaybe<QuestionWhere>;
};

export type QueryreactionArgs = {
  deleted?: InputMaybe<Scalars['Boolean']['input']>;
  where: ReactionWhereLookup;
};

export type QueryreactionsArgs = {
  deleted?: InputMaybe<Scalars['Boolean']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<ReactionOrderBy>>;
  where?: InputMaybe<ReactionWhere>;
};

export type QueryreviewArgs = {
  deleted?: InputMaybe<Scalars['Boolean']['input']>;
  where: ReviewWhereLookup;
};

export type QueryreviewsArgs = {
  deleted?: InputMaybe<Scalars['Boolean']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<ReviewOrderBy>>;
  where?: InputMaybe<ReviewWhere>;
};

export type QuerysomeObjectArgs = {
  deleted?: InputMaybe<Scalars['Boolean']['input']>;
  where: SomeObjectWhereLookup;
};

export type Question = Reaction & {
  childAnswers: Array<Answer>;
  childQuestions: Array<Question>;
  childReactions: Array<Reaction>;
  childReviews: Array<Review>;
  content: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  createdBy: User;
  deleteRootId: Maybe<Scalars['ID']['output']>;
  deleteRootType: Maybe<Scalars['String']['output']>;
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
  deleted?: InputMaybe<Scalars['Boolean']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<AnswerOrderBy>>;
  where?: InputMaybe<AnswerWhere>;
};

export type QuestionchildQuestionsArgs = {
  deleted?: InputMaybe<Scalars['Boolean']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<QuestionOrderBy>>;
  where?: InputMaybe<QuestionWhere>;
};

export type QuestionchildReactionsArgs = {
  deleted?: InputMaybe<Scalars['Boolean']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<ReactionOrderBy>>;
  where?: InputMaybe<ReactionWhere>;
};

export type QuestionchildReviewsArgs = {
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
  content: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  createdBy: User;
  deleteRootId: Maybe<Scalars['ID']['output']>;
  deleteRootType: Maybe<Scalars['String']['output']>;
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
  deleted?: InputMaybe<Scalars['Boolean']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<AnswerOrderBy>>;
  where?: InputMaybe<AnswerWhere>;
};

export type ReactionchildQuestionsArgs = {
  deleted?: InputMaybe<Scalars['Boolean']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<QuestionOrderBy>>;
  where?: InputMaybe<QuestionWhere>;
};

export type ReactionchildReactionsArgs = {
  deleted?: InputMaybe<Scalars['Boolean']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<ReactionOrderBy>>;
  where?: InputMaybe<ReactionWhere>;
};

export type ReactionchildReviewsArgs = {
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
  childAnswers: Array<Answer>;
  childQuestions: Array<Question>;
  childReactions: Array<Reaction>;
  childReviews: Array<Review>;
  content: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  createdBy: User;
  deleteRootId: Maybe<Scalars['ID']['output']>;
  deleteRootType: Maybe<Scalars['String']['output']>;
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
  deleted?: InputMaybe<Scalars['Boolean']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<AnswerOrderBy>>;
  where?: InputMaybe<AnswerWhere>;
};

export type ReviewchildQuestionsArgs = {
  deleted?: InputMaybe<Scalars['Boolean']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<QuestionOrderBy>>;
  where?: InputMaybe<QuestionWhere>;
};

export type ReviewchildReactionsArgs = {
  deleted?: InputMaybe<Scalars['Boolean']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<ReactionOrderBy>>;
  where?: InputMaybe<ReactionWhere>;
};

export type ReviewchildReviewsArgs = {
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
  ADMIN = 'ADMIN',
  USER = 'USER',
}

export enum SomeEnum {
  A = 'A',
  B = 'B',
  C = 'C',
}

export type SomeObject = {
  another: Maybe<AnotherObject>;
  createdAt: Scalars['DateTime']['output'];
  createdBy: User;
  deleteRootId: Maybe<Scalars['ID']['output']>;
  deleteRootType: Maybe<Scalars['String']['output']>;
  deleted: Scalars['Boolean']['output'];
  deletedAt: Maybe<Scalars['DateTime']['output']>;
  deletedBy: Maybe<User>;
  field: Maybe<Scalars['String']['output']>;
  float: Scalars['Float']['output'];
  id: Scalars['ID']['output'];
  list: Array<SomeEnum>;
  time: Maybe<Scalars['Time']['output']>;
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
  time?: InputMaybe<Scalars['Time']['input']>;
  xyz?: InputMaybe<Scalars['Int']['input']>;
};

export type User = {
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
  username: Maybe<Scalars['String']['output']>;
};

export type UsercreatedAnswersArgs = {
  deleted?: InputMaybe<Scalars['Boolean']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<AnswerOrderBy>>;
  where?: InputMaybe<AnswerWhere>;
};

export type UsercreatedManyObjectsArgs = {
  deleted?: InputMaybe<Scalars['Boolean']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<SomeObjectOrderBy>>;
  search?: InputMaybe<Scalars['String']['input']>;
  where?: InputMaybe<SomeObjectWhere>;
};

export type UsercreatedQuestionsArgs = {
  deleted?: InputMaybe<Scalars['Boolean']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<QuestionOrderBy>>;
  where?: InputMaybe<QuestionWhere>;
};

export type UsercreatedReactionsArgs = {
  deleted?: InputMaybe<Scalars['Boolean']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<ReactionOrderBy>>;
  where?: InputMaybe<ReactionWhere>;
};

export type UsercreatedReviewsArgs = {
  deleted?: InputMaybe<Scalars['Boolean']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<ReviewOrderBy>>;
  where?: InputMaybe<ReviewWhere>;
};

export type UserdeletedAnotherObjectsArgs = {
  deleted?: InputMaybe<Scalars['Boolean']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<AnotherObjectOrderBy>>;
  where?: InputMaybe<AnotherObjectWhere>;
};

export type UserdeletedAnswersArgs = {
  deleted?: InputMaybe<Scalars['Boolean']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<AnswerOrderBy>>;
  where?: InputMaybe<AnswerWhere>;
};

export type UserdeletedManyObjectsArgs = {
  deleted?: InputMaybe<Scalars['Boolean']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<SomeObjectOrderBy>>;
  search?: InputMaybe<Scalars['String']['input']>;
  where?: InputMaybe<SomeObjectWhere>;
};

export type UserdeletedQuestionsArgs = {
  deleted?: InputMaybe<Scalars['Boolean']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<QuestionOrderBy>>;
  where?: InputMaybe<QuestionWhere>;
};

export type UserdeletedReactionsArgs = {
  deleted?: InputMaybe<Scalars['Boolean']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<ReactionOrderBy>>;
  where?: InputMaybe<ReactionWhere>;
};

export type UserdeletedReviewsArgs = {
  deleted?: InputMaybe<Scalars['Boolean']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<ReviewOrderBy>>;
  where?: InputMaybe<ReviewWhere>;
};

export type UserupdatedAnswersArgs = {
  deleted?: InputMaybe<Scalars['Boolean']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<AnswerOrderBy>>;
  where?: InputMaybe<AnswerWhere>;
};

export type UserupdatedManyObjectsArgs = {
  deleted?: InputMaybe<Scalars['Boolean']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<SomeObjectOrderBy>>;
  search?: InputMaybe<Scalars['String']['input']>;
  where?: InputMaybe<SomeObjectWhere>;
};

export type UserupdatedQuestionsArgs = {
  deleted?: InputMaybe<Scalars['Boolean']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<QuestionOrderBy>>;
  where?: InputMaybe<QuestionWhere>;
};

export type UserupdatedReactionsArgs = {
  deleted?: InputMaybe<Scalars['Boolean']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<ReactionOrderBy>>;
  where?: InputMaybe<ReactionWhere>;
};

export type UserupdatedReviewsArgs = {
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
