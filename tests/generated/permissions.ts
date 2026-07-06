export type PermissionsConfig = Record<Role, PermissionsBlock>;
export type PermissionsBlock =
  | true
  | {
      me?: UserPermissions;
      User?: UserPermissions;
      AnotherObject?: AnotherObjectPermissions;
      SomeObject?: SomeObjectPermissions;
      Reaction?: ReactionPermissions;
      Review?: ReviewPermissions;
      Question?: QuestionPermissions;
      Answer?: AnswerPermissions;
    };
export type UserWhere = {};
export type UserPermissions = {
  READ?: boolean;
  CREATE?: true;
  UPDATE?: true;
  DELETE?: true;
  RESTORE?: true;
  LINK?: true;
  WHERE?: UserWhere;
  RELATIONS?: {
    deletedAnotherObjects?: AnotherObjectPermissions;
    createdManyObjects?: SomeObjectPermissions;
    updatedManyObjects?: SomeObjectPermissions;
    deletedManyObjects?: SomeObjectPermissions;
    createdReactions?: ReactionPermissions;
    updatedReactions?: ReactionPermissions;
    deletedReactions?: ReactionPermissions;
    createdReviews?: ReviewPermissions;
    updatedReviews?: ReviewPermissions;
    deletedReviews?: ReviewPermissions;
    createdQuestions?: QuestionPermissions;
    updatedQuestions?: QuestionPermissions;
    deletedQuestions?: QuestionPermissions;
    createdAnswers?: AnswerPermissions;
    updatedAnswers?: AnswerPermissions;
    deletedAnswers?: AnswerPermissions;
  };
};
export type AnotherObjectWhere = {};
export type AnotherObjectPermissions = {
  READ?: boolean;
  CREATE?: true;
  UPDATE?: true;
  DELETE?: true;
  RESTORE?: true;
  LINK?: true;
  WHERE?: AnotherObjectWhere;
  RELATIONS?: {
    myself?: AnotherObjectPermissions;
    deletedBy?: UserPermissions;
    self?: AnotherObjectPermissions;
    manyObjects?: SomeObjectPermissions;
  };
};
export type SomeObjectWhere = {
  field?: string | readonly string[];
  another?: AnotherObjectWhere;
  float?: number | readonly number[];
  xyz?: number | readonly number[];
};
export type SomeObjectPermissions = {
  READ?: boolean;
  CREATE?: true;
  UPDATE?: true;
  DELETE?: true;
  RESTORE?: true;
  LINK?: true;
  WHERE?: SomeObjectWhere;
  RELATIONS?: {
    another?: AnotherObjectPermissions;
    createdBy?: UserPermissions;
    updatedBy?: UserPermissions;
    deletedBy?: UserPermissions;
  };
};
export type ReactionWhere = {};
export type ReactionPermissions = {
  READ?: boolean;
  CREATE?: true;
  UPDATE?: true;
  DELETE?: true;
  RESTORE?: true;
  LINK?: true;
  WHERE?: ReactionWhere;
  RELATIONS?: {
    parent?: ReactionPermissions;
    createdBy?: UserPermissions;
    updatedBy?: UserPermissions;
    deletedBy?: UserPermissions;
    childReactions?: ReactionPermissions;
    childReviews?: ReviewPermissions;
    childQuestions?: QuestionPermissions;
    childAnswers?: AnswerPermissions;
  };
};
export type ReviewWhere = {};
export type ReviewPermissions = {
  READ?: boolean;
  CREATE?: true;
  UPDATE?: true;
  DELETE?: true;
  RESTORE?: true;
  LINK?: true;
  WHERE?: ReviewWhere;
  RELATIONS?: {
    parent?: ReactionPermissions;
    createdBy?: UserPermissions;
    updatedBy?: UserPermissions;
    deletedBy?: UserPermissions;
    childReactions?: ReactionPermissions;
    childReviews?: ReviewPermissions;
    childQuestions?: QuestionPermissions;
    childAnswers?: AnswerPermissions;
  };
};
export type QuestionWhere = {};
export type QuestionPermissions = {
  READ?: boolean;
  CREATE?: true;
  UPDATE?: true;
  DELETE?: true;
  RESTORE?: true;
  LINK?: true;
  WHERE?: QuestionWhere;
  RELATIONS?: {
    parent?: ReactionPermissions;
    createdBy?: UserPermissions;
    updatedBy?: UserPermissions;
    deletedBy?: UserPermissions;
    childReactions?: ReactionPermissions;
    childReviews?: ReviewPermissions;
    childQuestions?: QuestionPermissions;
    childAnswers?: AnswerPermissions;
  };
};
export type AnswerWhere = {};
export type AnswerPermissions = {
  READ?: boolean;
  CREATE?: true;
  UPDATE?: true;
  DELETE?: true;
  RESTORE?: true;
  LINK?: true;
  WHERE?: AnswerWhere;
  RELATIONS?: {
    parent?: ReactionPermissions;
    createdBy?: UserPermissions;
    updatedBy?: UserPermissions;
    deletedBy?: UserPermissions;
    childReactions?: ReactionPermissions;
    childReviews?: ReviewPermissions;
    childQuestions?: QuestionPermissions;
    childAnswers?: AnswerPermissions;
  };
};
type Role = 'ADMIN' | 'USER';
