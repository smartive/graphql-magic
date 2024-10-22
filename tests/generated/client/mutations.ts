import { gql } from 'graphql-request';

export const DELETE_ANOTHER_OBJECT = gql`
  mutation DeleteAnotherObjectMutation($id: ID!) {
    mutated: deleteAnotherObject(where: { id: $id })
  }
`;

export const RESTORE_ANOTHER_OBJECT = gql`
  mutation RestoreAnotherObjectMutation($id: ID!) {
    mutated: restoreAnotherObject(where: { id: $id })
  }
`;

export const CREATE_SOME_OBJECT = gql`
  mutation CreateSomeObjectMutation($data: CreateSomeObject!) {
    mutated: createSomeObject(data: $data) {
      id
    }
  }
`;

export const UPDATE_SOME_OBJECT = gql`
  mutation UpdateSomeObjectMutation($id: ID!, $data: UpdateSomeObject!) {
    mutated: updateSomeObject(where: { id: $id }, data: $data) {
      id
    }
  }
`;

export const DELETE_SOME_OBJECT = gql`
  mutation DeleteSomeObjectMutation($id: ID!) {
    mutated: deleteSomeObject(where: { id: $id })
  }
`;

export const RESTORE_SOME_OBJECT = gql`
  mutation RestoreSomeObjectMutation($id: ID!) {
    mutated: restoreSomeObject(where: { id: $id })
  }
`;

export const CREATE_REVIEW = gql`
  mutation CreateReviewMutation($data: CreateReview!) {
    mutated: createReview(data: $data) {
      id
    }
  }
`;

export const UPDATE_REVIEW = gql`
  mutation UpdateReviewMutation($id: ID!, $data: UpdateReview!) {
    mutated: updateReview(where: { id: $id }, data: $data) {
      id
    }
  }
`;

export const DELETE_REVIEW = gql`
  mutation DeleteReviewMutation($id: ID!) {
    mutated: deleteReview(where: { id: $id })
  }
`;

export const RESTORE_REVIEW = gql`
  mutation RestoreReviewMutation($id: ID!) {
    mutated: restoreReview(where: { id: $id })
  }
`;

export const CREATE_QUESTION = gql`
  mutation CreateQuestionMutation($data: CreateQuestion!) {
    mutated: createQuestion(data: $data) {
      id
    }
  }
`;

export const UPDATE_QUESTION = gql`
  mutation UpdateQuestionMutation($id: ID!, $data: UpdateQuestion!) {
    mutated: updateQuestion(where: { id: $id }, data: $data) {
      id
    }
  }
`;

export const DELETE_QUESTION = gql`
  mutation DeleteQuestionMutation($id: ID!) {
    mutated: deleteQuestion(where: { id: $id })
  }
`;

export const RESTORE_QUESTION = gql`
  mutation RestoreQuestionMutation($id: ID!) {
    mutated: restoreQuestion(where: { id: $id })
  }
`;

export const CREATE_ANSWER = gql`
  mutation CreateAnswerMutation($data: CreateAnswer!) {
    mutated: createAnswer(data: $data) {
      id
    }
  }
`;

export const UPDATE_ANSWER = gql`
  mutation UpdateAnswerMutation($id: ID!, $data: UpdateAnswer!) {
    mutated: updateAnswer(where: { id: $id }, data: $data) {
      id
    }
  }
`;

export const DELETE_ANSWER = gql`
  mutation DeleteAnswerMutation($id: ID!) {
    mutated: deleteAnswer(where: { id: $id })
  }
`;

export const RESTORE_ANSWER = gql`
  mutation RestoreAnswerMutation($id: ID!) {
    mutated: restoreAnswer(where: { id: $id })
  }
`;

export const MUTATIONS = {
  User: {},

  AnotherObject: {
    delete: DELETE_ANOTHER_OBJECT,
    restore: RESTORE_ANOTHER_OBJECT,
  },

  SomeObject: {
    create: CREATE_SOME_OBJECT,
    update: UPDATE_SOME_OBJECT,
    delete: DELETE_SOME_OBJECT,
    restore: RESTORE_SOME_OBJECT,
  },

  Review: {
    create: CREATE_REVIEW,
    update: UPDATE_REVIEW,
    delete: DELETE_REVIEW,
    restore: RESTORE_REVIEW,
  },

  Question: {
    create: CREATE_QUESTION,
    update: UPDATE_QUESTION,
    delete: DELETE_QUESTION,
    restore: RESTORE_QUESTION,
  },

  Answer: {
    create: CREATE_ANSWER,
    update: UPDATE_ANSWER,
    delete: DELETE_ANSWER,
    restore: RESTORE_ANSWER,
  },
};
