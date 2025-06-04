export type PermissionsConfig = Record<Role, PermissionsBlock>;
export type PermissionsBlock = true | {
  me?: UserPermissionsBlock,
  User?: UserPermissionsBlock,
  AnotherObject?: AnotherObjectPermissionsBlock,
  SomeObject?: SomeObjectPermissionsBlock,
  Reaction?: ReactionPermissionsBlock,
  Review?: ReviewPermissionsBlock,
  Question?: QuestionPermissionsBlock,
  Answer?: AnswerPermissionsBlock,
}
type SomeEnum = 'A' | 'B' | 'C';
type Role = 'ADMIN' | 'USER';
type ReactionType = 'Review' | 'Question' | 'Answer';
export type UserWhere = {
}
export type UserPermissionsBlock = {
  READ?: true,
  CREATE?: true,
  UPDATE?: true,
  DELETE?: true,
  RESTORE?: true,
  LINK?: true,
  WHERE?: UserWhere,
  RELATIONS?: {
    deletedAnotherObjects?: AnotherObjectPermissionsBlock,
    createdManyObjects?: SomeObjectPermissionsBlock,
    updatedManyObjects?: SomeObjectPermissionsBlock,
    deletedManyObjects?: SomeObjectPermissionsBlock,
    createdReactions?: ReactionPermissionsBlock,
    updatedReactions?: ReactionPermissionsBlock,
    deletedReactions?: ReactionPermissionsBlock,
    createdReviews?: ReviewPermissionsBlock,
    updatedReviews?: ReviewPermissionsBlock,
    deletedReviews?: ReviewPermissionsBlock,
    createdQuestions?: QuestionPermissionsBlock,
    updatedQuestions?: QuestionPermissionsBlock,
    deletedQuestions?: QuestionPermissionsBlock,
    createdAnswers?: AnswerPermissionsBlock,
    updatedAnswers?: AnswerPermissionsBlock,
    deletedAnswers?: AnswerPermissionsBlock,
  }
}
export type AnotherObjectWhere = {
  deleted?: boolean | boolean[],
}
export type AnotherObjectPermissionsBlock = {
  READ?: true,
  CREATE?: true,
  UPDATE?: true,
  DELETE?: true,
  RESTORE?: true,
  LINK?: true,
  WHERE?: AnotherObjectWhere,
  RELATIONS?: {
    myself?: AnotherObjectPermissionsBlock,
    deletedBy?: UserPermissionsBlock,
    self?: AnotherObjectPermissionsBlock,
    manyObjects?: SomeObjectPermissionsBlock,
  }
}
export type SomeObjectWhere = {
  field?: string | string[],
  another?: AnotherObjectWhere,
  float?: number | number[],
  xyz?: number | number[],
  deleted?: boolean | boolean[],
}
export type SomeObjectPermissionsBlock = {
  READ?: true,
  CREATE?: true,
  UPDATE?: true,
  DELETE?: true,
  RESTORE?: true,
  LINK?: true,
  WHERE?: SomeObjectWhere,
  RELATIONS?: {
    another?: AnotherObjectPermissionsBlock,
    createdBy?: UserPermissionsBlock,
    updatedBy?: UserPermissionsBlock,
    deletedBy?: UserPermissionsBlock,
  }
}
export type ReactionWhere = {
  deleted?: boolean | boolean[],
}
export type ReactionPermissionsBlock = {
  READ?: true,
  CREATE?: true,
  UPDATE?: true,
  DELETE?: true,
  RESTORE?: true,
  LINK?: true,
  WHERE?: ReactionWhere,
  RELATIONS?: {
    parent?: ReactionPermissionsBlock,
    createdBy?: UserPermissionsBlock,
    updatedBy?: UserPermissionsBlock,
    deletedBy?: UserPermissionsBlock,
    childReactions?: ReactionPermissionsBlock,
    childReviews?: ReviewPermissionsBlock,
    childQuestions?: QuestionPermissionsBlock,
    childAnswers?: AnswerPermissionsBlock,
  }
}
export type ReviewWhere = {
  deleted?: boolean | boolean[],
}
export type ReviewPermissionsBlock = {
  READ?: true,
  CREATE?: true,
  UPDATE?: true,
  DELETE?: true,
  RESTORE?: true,
  LINK?: true,
  WHERE?: ReviewWhere,
  RELATIONS?: {
    parent?: ReactionPermissionsBlock,
    createdBy?: UserPermissionsBlock,
    updatedBy?: UserPermissionsBlock,
    deletedBy?: UserPermissionsBlock,
    childReactions?: ReactionPermissionsBlock,
    childReviews?: ReviewPermissionsBlock,
    childQuestions?: QuestionPermissionsBlock,
    childAnswers?: AnswerPermissionsBlock,
  }
}
export type QuestionWhere = {
  deleted?: boolean | boolean[],
}
export type QuestionPermissionsBlock = {
  READ?: true,
  CREATE?: true,
  UPDATE?: true,
  DELETE?: true,
  RESTORE?: true,
  LINK?: true,
  WHERE?: QuestionWhere,
  RELATIONS?: {
    parent?: ReactionPermissionsBlock,
    createdBy?: UserPermissionsBlock,
    updatedBy?: UserPermissionsBlock,
    deletedBy?: UserPermissionsBlock,
    childReactions?: ReactionPermissionsBlock,
    childReviews?: ReviewPermissionsBlock,
    childQuestions?: QuestionPermissionsBlock,
    childAnswers?: AnswerPermissionsBlock,
  }
}
export type AnswerWhere = {
  deleted?: boolean | boolean[],
}
export type AnswerPermissionsBlock = {
  READ?: true,
  CREATE?: true,
  UPDATE?: true,
  DELETE?: true,
  RESTORE?: true,
  LINK?: true,
  WHERE?: AnswerWhere,
  RELATIONS?: {
    parent?: ReactionPermissionsBlock,
    createdBy?: UserPermissionsBlock,
    updatedBy?: UserPermissionsBlock,
    deletedBy?: UserPermissionsBlock,
    childReactions?: ReactionPermissionsBlock,
    childReviews?: ReviewPermissionsBlock,
    childQuestions?: QuestionPermissionsBlock,
    childAnswers?: AnswerPermissionsBlock,
  }
}
