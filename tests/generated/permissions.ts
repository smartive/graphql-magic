export type PermissionsConfig = Record<Role, PermissionsBlock>;
export type PermissionsBlock = true | {
  me?: UserPermissions,
  User?: UserPermissions,
  AnotherObject?: AnotherObjectPermissions,
  SomeObject?: SomeObjectPermissions,
  Reaction?: ReactionPermissions,
  Review?: ReviewPermissions,
  Question?: QuestionPermissions,
  Answer?: AnswerPermissions,
}
type SomeEnum = 'A' | 'B' | 'C';
type Role = 'ADMIN' | 'USER';
type ReactionType = 'Review' | 'Question' | 'Answer';
export type UserWhere = {
}
export type UserPermissions = {
  READ?: true,
  CREATE?: true,
  UPDATE?: true,
  DELETE?: true,
  RESTORE?: true,
  LINK?: true,
  WHERE?: UserWhere,
  RELATIONS?: {
    deletedAnotherObjects?: AnotherObjectPermissions,
    createdManyObjects?: SomeObjectPermissions,
    updatedManyObjects?: SomeObjectPermissions,
    deletedManyObjects?: SomeObjectPermissions,
    createdReactions?: ReactionPermissions,
    updatedReactions?: ReactionPermissions,
    deletedReactions?: ReactionPermissions,
    createdReviews?: ReviewPermissions,
    updatedReviews?: ReviewPermissions,
    deletedReviews?: ReviewPermissions,
    createdQuestions?: QuestionPermissions,
    updatedQuestions?: QuestionPermissions,
    deletedQuestions?: QuestionPermissions,
    createdAnswers?: AnswerPermissions,
    updatedAnswers?: AnswerPermissions,
    deletedAnswers?: AnswerPermissions,
  }
}
export type AnotherObjectWhere = {
  deleted?: boolean | boolean[],
}
export type AnotherObjectPermissions = {
  READ?: true,
  CREATE?: true,
  UPDATE?: true,
  DELETE?: true,
  RESTORE?: true,
  LINK?: true,
  WHERE?: AnotherObjectWhere,
  RELATIONS?: {
    myself?: AnotherObjectPermissions,
    deletedBy?: UserPermissions,
    self?: AnotherObjectPermissions,
    manyObjects?: SomeObjectPermissions,
  }
}
export type SomeObjectWhere = {
  field?: string | string[],
  another?: AnotherObjectWhere,
  float?: number | number[],
  xyz?: number | number[],
  deleted?: boolean | boolean[],
}
export type SomeObjectPermissions = {
  READ?: true,
  CREATE?: true,
  UPDATE?: true,
  DELETE?: true,
  RESTORE?: true,
  LINK?: true,
  WHERE?: SomeObjectWhere,
  RELATIONS?: {
    another?: AnotherObjectPermissions,
    createdBy?: UserPermissions,
    updatedBy?: UserPermissions,
    deletedBy?: UserPermissions,
  }
}
export type ReactionWhere = {
  deleted?: boolean | boolean[],
}
export type ReactionPermissions = {
  READ?: true,
  CREATE?: true,
  UPDATE?: true,
  DELETE?: true,
  RESTORE?: true,
  LINK?: true,
  WHERE?: ReactionWhere,
  RELATIONS?: {
    parent?: ReactionPermissions,
    createdBy?: UserPermissions,
    updatedBy?: UserPermissions,
    deletedBy?: UserPermissions,
    childReactions?: ReactionPermissions,
    childReviews?: ReviewPermissions,
    childQuestions?: QuestionPermissions,
    childAnswers?: AnswerPermissions,
  }
}
export type ReviewWhere = {
  deleted?: boolean | boolean[],
}
export type ReviewPermissions = {
  READ?: true,
  CREATE?: true,
  UPDATE?: true,
  DELETE?: true,
  RESTORE?: true,
  LINK?: true,
  WHERE?: ReviewWhere,
  RELATIONS?: {
    parent?: ReactionPermissions,
    createdBy?: UserPermissions,
    updatedBy?: UserPermissions,
    deletedBy?: UserPermissions,
    childReactions?: ReactionPermissions,
    childReviews?: ReviewPermissions,
    childQuestions?: QuestionPermissions,
    childAnswers?: AnswerPermissions,
  }
}
export type QuestionWhere = {
  deleted?: boolean | boolean[],
}
export type QuestionPermissions = {
  READ?: true,
  CREATE?: true,
  UPDATE?: true,
  DELETE?: true,
  RESTORE?: true,
  LINK?: true,
  WHERE?: QuestionWhere,
  RELATIONS?: {
    parent?: ReactionPermissions,
    createdBy?: UserPermissions,
    updatedBy?: UserPermissions,
    deletedBy?: UserPermissions,
    childReactions?: ReactionPermissions,
    childReviews?: ReviewPermissions,
    childQuestions?: QuestionPermissions,
    childAnswers?: AnswerPermissions,
  }
}
export type AnswerWhere = {
  deleted?: boolean | boolean[],
}
export type AnswerPermissions = {
  READ?: true,
  CREATE?: true,
  UPDATE?: true,
  DELETE?: true,
  RESTORE?: true,
  LINK?: true,
  WHERE?: AnswerWhere,
  RELATIONS?: {
    parent?: ReactionPermissions,
    createdBy?: UserPermissions,
    updatedBy?: UserPermissions,
    deletedBy?: UserPermissions,
    childReactions?: ReactionPermissions,
    childReviews?: ReviewPermissions,
    childQuestions?: QuestionPermissions,
    childAnswers?: AnswerPermissions,
  }
}
