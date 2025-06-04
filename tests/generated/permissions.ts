export type PermissionsConfig = Record<Role, PermissionsBlock>;
export type PermissionsBlock = true | {
  me?: UserPermissionBlock,
  User?: UserPermissionBlock,
  AnotherObject?: AnotherObjectPermissionBlock,
  SomeObject?: SomeObjectPermissionBlock,
  Reaction?: ReactionPermissionBlock,
  Review?: ReviewPermissionBlock,
  Question?: QuestionPermissionBlock,
  Answer?: AnswerPermissionBlock,
}
type SomeEnum = 'A' | 'B' | 'C';
type Role = 'ADMIN' | 'USER';
type ReactionType = 'Review' | 'Question' | 'Answer';
export type UserWhere = {
}
export type UserPermissionBlock = {
  READ?: true,
  CREATE?: true,
  UPDATE?: true,
  DELETE?: true,
  RESTORE?: true,
  LINK?: true,
  WHERE?: UserWhere,
  RELATIONS?: {
    deletedAnotherObjects?: AnotherObjectPermissionBlock,
    createdManyObjects?: SomeObjectPermissionBlock,
    updatedManyObjects?: SomeObjectPermissionBlock,
    deletedManyObjects?: SomeObjectPermissionBlock,
    createdReactions?: ReactionPermissionBlock,
    updatedReactions?: ReactionPermissionBlock,
    deletedReactions?: ReactionPermissionBlock,
    createdReviews?: ReviewPermissionBlock,
    updatedReviews?: ReviewPermissionBlock,
    deletedReviews?: ReviewPermissionBlock,
    createdQuestions?: QuestionPermissionBlock,
    updatedQuestions?: QuestionPermissionBlock,
    deletedQuestions?: QuestionPermissionBlock,
    createdAnswers?: AnswerPermissionBlock,
    updatedAnswers?: AnswerPermissionBlock,
    deletedAnswers?: AnswerPermissionBlock,
  }
}
export type AnotherObjectWhere = {
  deleted?: boolean | boolean[],
}
export type AnotherObjectPermissionBlock = {
  READ?: true,
  CREATE?: true,
  UPDATE?: true,
  DELETE?: true,
  RESTORE?: true,
  LINK?: true,
  WHERE?: AnotherObjectWhere,
  RELATIONS?: {
    myself?: AnotherObjectPermissionBlock,
    deletedBy?: UserPermissionBlock,
    self?: AnotherObjectPermissionBlock,
    manyObjects?: SomeObjectPermissionBlock,
  }
}
export type SomeObjectWhere = {
  field?: string | string[],
  another?: AnotherObjectWhere,
  float?: number | number[],
  xyz?: number | number[],
  deleted?: boolean | boolean[],
}
export type SomeObjectPermissionBlock = {
  READ?: true,
  CREATE?: true,
  UPDATE?: true,
  DELETE?: true,
  RESTORE?: true,
  LINK?: true,
  WHERE?: SomeObjectWhere,
  RELATIONS?: {
    another?: AnotherObjectPermissionBlock,
    createdBy?: UserPermissionBlock,
    updatedBy?: UserPermissionBlock,
    deletedBy?: UserPermissionBlock,
  }
}
export type ReactionWhere = {
  deleted?: boolean | boolean[],
}
export type ReactionPermissionBlock = {
  READ?: true,
  CREATE?: true,
  UPDATE?: true,
  DELETE?: true,
  RESTORE?: true,
  LINK?: true,
  WHERE?: ReactionWhere,
  RELATIONS?: {
    parent?: ReactionPermissionBlock,
    createdBy?: UserPermissionBlock,
    updatedBy?: UserPermissionBlock,
    deletedBy?: UserPermissionBlock,
    childReactions?: ReactionPermissionBlock,
    childReviews?: ReviewPermissionBlock,
    childQuestions?: QuestionPermissionBlock,
    childAnswers?: AnswerPermissionBlock,
  }
}
export type ReviewWhere = {
  deleted?: boolean | boolean[],
}
export type ReviewPermissionBlock = {
  READ?: true,
  CREATE?: true,
  UPDATE?: true,
  DELETE?: true,
  RESTORE?: true,
  LINK?: true,
  WHERE?: ReviewWhere,
  RELATIONS?: {
    parent?: ReactionPermissionBlock,
    createdBy?: UserPermissionBlock,
    updatedBy?: UserPermissionBlock,
    deletedBy?: UserPermissionBlock,
    childReactions?: ReactionPermissionBlock,
    childReviews?: ReviewPermissionBlock,
    childQuestions?: QuestionPermissionBlock,
    childAnswers?: AnswerPermissionBlock,
  }
}
export type QuestionWhere = {
  deleted?: boolean | boolean[],
}
export type QuestionPermissionBlock = {
  READ?: true,
  CREATE?: true,
  UPDATE?: true,
  DELETE?: true,
  RESTORE?: true,
  LINK?: true,
  WHERE?: QuestionWhere,
  RELATIONS?: {
    parent?: ReactionPermissionBlock,
    createdBy?: UserPermissionBlock,
    updatedBy?: UserPermissionBlock,
    deletedBy?: UserPermissionBlock,
    childReactions?: ReactionPermissionBlock,
    childReviews?: ReviewPermissionBlock,
    childQuestions?: QuestionPermissionBlock,
    childAnswers?: AnswerPermissionBlock,
  }
}
export type AnswerWhere = {
  deleted?: boolean | boolean[],
}
export type AnswerPermissionBlock = {
  READ?: true,
  CREATE?: true,
  UPDATE?: true,
  DELETE?: true,
  RESTORE?: true,
  LINK?: true,
  WHERE?: AnswerWhere,
  RELATIONS?: {
    parent?: ReactionPermissionBlock,
    createdBy?: UserPermissionBlock,
    updatedBy?: UserPermissionBlock,
    deletedBy?: UserPermissionBlock,
    childReactions?: ReactionPermissionBlock,
    childReviews?: ReviewPermissionBlock,
    childQuestions?: QuestionPermissionBlock,
    childAnswers?: AnswerPermissionBlock,
  }
}
