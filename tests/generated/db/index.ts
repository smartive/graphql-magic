import { DateTime } from 'luxon';

export type SomeEnum = 'A' | 'B' | 'C';

export type Role = 'ADMIN' | 'USER';

export type ReactionType = 'Review' | 'Question' | 'Answer';

export type User = {
  'id': string;
  'username': string | null;
  'role': Role | null;
}

export type UserInitializer = {
  'id': string;
  'username'?: string | null;
  'role'?: Role | null;
}

export type UserMutator = {
  'id'?: string;
  'username'?: string | null;
  'role'?: Role | null;
}

export type UserSeed = {
  'id': string;
  'username'?: string | null;
  'role'?: string | null;
}

export type AnotherObject = {
  'id': string;
  'name': string | null;
  'myselfId': string | null;
  'deleted': boolean;
  'deletedAt': DateTime | null;
  'deletedById': string | null;
}

export type AnotherObjectInitializer = {
  'id': string;
  'name'?: string | null;
  'myselfId'?: string | null;
  'deleted'?: boolean;
  'deletedAt'?: (DateTime | string) | null;
  'deletedById'?: string | null;
}

export type AnotherObjectMutator = {
  'id'?: string;
  'name'?: string | null;
  'myselfId'?: string | null;
  'deleted'?: boolean;
  'deletedAt'?: (DateTime | string) | null;
  'deletedById'?: string | null;
}

export type AnotherObjectSeed = {
  'id': string;
  'name'?: string | null;
  'myselfId'?: string | null;
  'deleted'?: boolean;
  'deletedAt'?: (DateTime | string) | null;
  'deletedById'?: string | null;
}

export type SomeObject = {
  'id': string;
  'field': string | null;
  'anotherId': string;
  'float': number;
  'list': SomeEnum[];
  'xyz': number;
  'createdAt': DateTime;
  'createdById': string;
  'updatedAt': DateTime;
  'updatedById': string;
  'deleted': boolean;
  'deletedAt': DateTime | null;
  'deletedById': string | null;
}

export type SomeObjectInitializer = {
  'id': string;
  'field'?: string | null;
  'anotherId': string;
  'float': number;
  'list': SomeEnum[] | string;
  'xyz': number;
  'createdAt': (DateTime | string);
  'createdById': string;
  'updatedAt': (DateTime | string);
  'updatedById': string;
  'deleted'?: boolean;
  'deletedAt'?: (DateTime | string) | null;
  'deletedById'?: string | null;
}

export type SomeObjectMutator = {
  'id'?: string;
  'field'?: string | null;
  'anotherId'?: string;
  'float'?: number;
  'list'?: SomeEnum[] | string;
  'xyz'?: number;
  'createdAt'?: (DateTime | string);
  'createdById'?: string;
  'updatedAt'?: (DateTime | string);
  'updatedById'?: string;
  'deleted'?: boolean;
  'deletedAt'?: (DateTime | string) | null;
  'deletedById'?: string | null;
}

export type SomeObjectSeed = {
  'id': string;
  'field'?: string | null;
  'anotherId': string;
  'float': number;
  'list': string[] | string;
  'xyz': number;
  'createdAt'?: (DateTime | string);
  'createdById'?: string;
  'updatedAt'?: (DateTime | string);
  'updatedById'?: string;
  'deleted'?: boolean;
  'deletedAt'?: (DateTime | string) | null;
  'deletedById'?: string | null;
}

export type Reaction = {
  'id': string;
  'type': ReactionType;
  'parentId': string | null;
  'content': string | null;
  'createdAt': DateTime;
  'createdById': string;
  'updatedAt': DateTime;
  'updatedById': string;
  'deleted': boolean;
  'deletedAt': DateTime | null;
  'deletedById': string | null;
}

export type ReactionInitializer = {
  'id': string;
  'type': ReactionType;
  'parentId'?: string | null;
  'content'?: string | null;
  'createdAt': (DateTime | string);
  'createdById': string;
  'updatedAt': (DateTime | string);
  'updatedById': string;
  'deleted'?: boolean;
  'deletedAt'?: (DateTime | string) | null;
  'deletedById'?: string | null;
}

export type ReactionMutator = {
  'id'?: string;
  'type'?: ReactionType;
  'parentId'?: string | null;
  'content'?: string | null;
  'createdAt'?: (DateTime | string);
  'createdById'?: string;
  'updatedAt'?: (DateTime | string);
  'updatedById'?: string;
  'deleted'?: boolean;
  'deletedAt'?: (DateTime | string) | null;
  'deletedById'?: string | null;
}

export type Review = {
  'id': string;
  'type': ReactionType;
  'parentId': string | null;
  'content': string | null;
  'createdAt': DateTime;
  'createdById': string;
  'updatedAt': DateTime;
  'updatedById': string;
  'deleted': boolean;
  'deletedAt': DateTime | null;
  'deletedById': string | null;
  'rating': number | null;
}

export type ReviewInitializer = {
  'id': string;
  'rating'?: number | null;
}

export type ReviewMutator = {
  'id'?: string;
  'rating'?: number | null;
}

export type ReviewSeed = {
  'id': string;
  'parentId'?: string | null;
  'content'?: string | null;
  'createdAt'?: (DateTime | string);
  'createdById'?: string;
  'updatedAt'?: (DateTime | string);
  'updatedById'?: string;
  'deleted'?: boolean;
  'deletedAt'?: (DateTime | string) | null;
  'deletedById'?: string | null;
  'rating'?: number | null;
}

export type Question = {
  'id': string;
  'type': ReactionType;
  'parentId': string | null;
  'content': string | null;
  'createdAt': DateTime;
  'createdById': string;
  'updatedAt': DateTime;
  'updatedById': string;
  'deleted': boolean;
  'deletedAt': DateTime | null;
  'deletedById': string | null;
}

export type QuestionInitializer = {
  'id': string;
}

export type QuestionMutator = {
  'id'?: string;
}

export type QuestionSeed = {
  'id': string;
  'parentId'?: string | null;
  'content'?: string | null;
  'createdAt'?: (DateTime | string);
  'createdById'?: string;
  'updatedAt'?: (DateTime | string);
  'updatedById'?: string;
  'deleted'?: boolean;
  'deletedAt'?: (DateTime | string) | null;
  'deletedById'?: string | null;
}

export type Answer = {
  'id': string;
  'type': ReactionType;
  'parentId': string | null;
  'content': string | null;
  'createdAt': DateTime;
  'createdById': string;
  'updatedAt': DateTime;
  'updatedById': string;
  'deleted': boolean;
  'deletedAt': DateTime | null;
  'deletedById': string | null;
}

export type AnswerInitializer = {
  'id': string;
}

export type AnswerMutator = {
  'id'?: string;
}

export type AnswerSeed = {
  'id': string;
  'parentId'?: string | null;
  'content'?: string | null;
  'createdAt'?: (DateTime | string);
  'createdById'?: string;
  'updatedAt'?: (DateTime | string);
  'updatedById'?: string;
  'deleted'?: boolean;
  'deletedAt'?: (DateTime | string) | null;
  'deletedById'?: string | null;
}

export type SeedData = {
  User: UserSeed[];
  AnotherObject: AnotherObjectSeed[];
  SomeObject: SomeObjectSeed[];
  Review: ReviewSeed[];
  Question: QuestionSeed[];
  Answer: AnswerSeed[];
}