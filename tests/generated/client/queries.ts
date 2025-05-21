import { gql } from './gql';
export const ANOTHER_OBJECT_LIST_ADMIN = gql`
  query AnotherObjectsListADMIN($limit: Int!, $where: AnotherObjectWhere!) {
    data: anotherObjects(limit: $limit, where: $where) {
      display: name

      id
      name
      deleted
      deletedAt
    }
  }
`;
export const ANOTHER_OBJECT_LIST_USER = gql`
  query AnotherObjectsListUSER($limit: Int!, $where: AnotherObjectWhere!) {
    data: anotherObjects(limit: $limit, where: $where) {
      display: name

      id
      name
      deleted
      deletedAt
    }
  }
`;
export const UPDATE_QUERY_SOME_OBJECT_ADMIN = gql`
  query UpdateQuerySomeObjectADMIN($id: ID!) {
    data: someObject(where: { id: $id }) {
      id
    }
  }
`;
export const SOME_OBJECT_LIST_ADMIN = gql`
  query ManyObjectsListADMIN($limit: Int!, $where: SomeObjectWhere!, $search: String) {
    data: manyObjects(limit: $limit, where: $where, search: $search) {
      id
      field
      float
      list
      xyz
      createdAt
      updatedAt
      deleted
      deletedAt
    }
  }
`;
export const UPDATE_QUERY_SOME_OBJECT_USER = gql`
  query UpdateQuerySomeObjectUSER($id: ID!) {
    data: someObject(where: { id: $id }) {
      id
    }
  }
`;
export const SOME_OBJECT_LIST_USER = gql`
  query ManyObjectsListUSER($limit: Int!, $where: SomeObjectWhere!, $search: String) {
    data: manyObjects(limit: $limit, where: $where, search: $search) {
      id
      field
      float
      list
      xyz
      createdAt
      updatedAt
      deleted
      deletedAt
    }
  }
`;
export const UPDATE_QUERY_REACTION_ADMIN = gql`
  query UpdateQueryReactionADMIN($id: ID!) {
    data: reaction(where: { id: $id }) {
      id
    }
  }
`;
export const REACTION_LIST_ADMIN = gql`
  query ReactionsListADMIN($limit: Int!, $where: ReactionWhere!) {
    data: reactions(limit: $limit, where: $where) {
      id
      type
      content
      createdAt
      updatedAt
      deleted
      deletedAt
    }
  }
`;
export const UPDATE_QUERY_REACTION_USER = gql`
  query UpdateQueryReactionUSER($id: ID!) {
    data: reaction(where: { id: $id }) {
      id
    }
  }
`;
export const REACTION_LIST_USER = gql`
  query ReactionsListUSER($limit: Int!, $where: ReactionWhere!) {
    data: reactions(limit: $limit, where: $where) {
      id
      type
      content
      createdAt
      updatedAt
      deleted
      deletedAt
    }
  }
`;
export const UPDATE_QUERY_REVIEW_ADMIN = gql`
  query UpdateQueryReviewADMIN($id: ID!) {
    data: review(where: { id: $id }) {
      id
    }
  }
`;
export const REVIEW_LIST_ADMIN = gql`
  query ReviewsListADMIN($limit: Int!, $where: ReviewWhere!) {
    data: reviews(limit: $limit, where: $where) {
      id
      type
      content
      createdAt
      updatedAt
      deleted
      deletedAt
      rating
    }
  }
`;
export const UPDATE_QUERY_REVIEW_USER = gql`
  query UpdateQueryReviewUSER($id: ID!) {
    data: review(where: { id: $id }) {
      id
    }
  }
`;
export const REVIEW_LIST_USER = gql`
  query ReviewsListUSER($limit: Int!, $where: ReviewWhere!) {
    data: reviews(limit: $limit, where: $where) {
      id
      type
      content
      createdAt
      updatedAt
      deleted
      deletedAt
      rating
    }
  }
`;
export const UPDATE_QUERY_QUESTION_ADMIN = gql`
  query UpdateQueryQuestionADMIN($id: ID!) {
    data: question(where: { id: $id }) {
      id
    }
  }
`;
export const QUESTION_LIST_ADMIN = gql`
  query QuestionsListADMIN($limit: Int!, $where: QuestionWhere!) {
    data: questions(limit: $limit, where: $where) {
      id
      type
      content
      createdAt
      updatedAt
      deleted
      deletedAt
    }
  }
`;
export const UPDATE_QUERY_QUESTION_USER = gql`
  query UpdateQueryQuestionUSER($id: ID!) {
    data: question(where: { id: $id }) {
      id
    }
  }
`;
export const QUESTION_LIST_USER = gql`
  query QuestionsListUSER($limit: Int!, $where: QuestionWhere!) {
    data: questions(limit: $limit, where: $where) {
      id
      type
      content
      createdAt
      updatedAt
      deleted
      deletedAt
    }
  }
`;
export const UPDATE_QUERY_ANSWER_ADMIN = gql`
  query UpdateQueryAnswerADMIN($id: ID!) {
    data: answer(where: { id: $id }) {
      id
    }
  }
`;
export const ANSWER_LIST_ADMIN = gql`
  query AnswersListADMIN($limit: Int!, $where: AnswerWhere!) {
    data: answers(limit: $limit, where: $where) {
      id
      type
      content
      createdAt
      updatedAt
      deleted
      deletedAt
    }
  }
`;
export const UPDATE_QUERY_ANSWER_USER = gql`
  query UpdateQueryAnswerUSER($id: ID!) {
    data: answer(where: { id: $id }) {
      id
    }
  }
`;
export const ANSWER_LIST_USER = gql`
  query AnswersListUSER($limit: Int!, $where: AnswerWhere!) {
    data: answers(limit: $limit, where: $where) {
      id
      type
      content
      createdAt
      updatedAt
      deleted
      deletedAt
    }
  }
`;
export const UPDATE_QUERIES = {
  SomeObject: {
    ADMIN: UPDATE_QUERY_SOME_OBJECT_ADMIN,
    USER: UPDATE_QUERY_SOME_OBJECT_USER,
  },
  Reaction: {
    ADMIN: UPDATE_QUERY_REACTION_ADMIN,
    USER: UPDATE_QUERY_REACTION_USER,
  },
  Review: {
    ADMIN: UPDATE_QUERY_REVIEW_ADMIN,
    USER: UPDATE_QUERY_REVIEW_USER,
  },
  Question: {
    ADMIN: UPDATE_QUERY_QUESTION_ADMIN,
    USER: UPDATE_QUERY_QUESTION_USER,
  },
  Answer: {
    ADMIN: UPDATE_QUERY_ANSWER_ADMIN,
    USER: UPDATE_QUERY_ANSWER_USER,
  },
};
