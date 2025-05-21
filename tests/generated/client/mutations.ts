import { gql } from "./gql";
export const DELETE_ANOTHER_OBJECT = gql`
  mutation DeleteAnotherObjectMutation($id: ID!) {
    deleteAnotherObject(where: { id: $id })
  }
`;
export const RESTORE_ANOTHER_OBJECT = gql`
  mutation RestoreAnotherObjectMutation($id: ID!) {
    restoreAnotherObject(where: { id: $id })
  }
`;
export const CREATE_SOME_OBJECT = gql`
  mutation CreateSomeObjectMutation($data: CreateSomeObject!) {
    createSomeObject(data: $data) { id }
  }
`;
export const UPDATE_SOME_OBJECT = gql`
  mutation UpdateSomeObjectMutation($id: ID!, $data: UpdateSomeObject!) {
    updateSomeObject(where: { id: $id }, data: $data) { id }
  }
`;
export const DELETE_SOME_OBJECT = gql`
  mutation DeleteSomeObjectMutation($id: ID!) {
    deleteSomeObject(where: { id: $id })
  }
`;
export const RESTORE_SOME_OBJECT = gql`
  mutation RestoreSomeObjectMutation($id: ID!) {
    restoreSomeObject(where: { id: $id })
  }
`;
export const CREATE_REVIEW = gql`
  mutation CreateReviewMutation($data: CreateReview!) {
    createReview(data: $data) { id }
  }
`;
export const UPDATE_REVIEW = gql`
  mutation UpdateReviewMutation($id: ID!, $data: UpdateReview!) {
    updateReview(where: { id: $id }, data: $data) { id }
  }
`;
export const DELETE_REVIEW = gql`
  mutation DeleteReviewMutation($id: ID!) {
    deleteReview(where: { id: $id })
  }
`;
export const RESTORE_REVIEW = gql`
  mutation RestoreReviewMutation($id: ID!) {
    restoreReview(where: { id: $id })
  }
`;
export const CREATE_QUESTION = gql`
  mutation CreateQuestionMutation($data: CreateQuestion!) {
    createQuestion(data: $data) { id }
  }
`;
export const UPDATE_QUESTION = gql`
  mutation UpdateQuestionMutation($id: ID!, $data: UpdateQuestion!) {
    updateQuestion(where: { id: $id }, data: $data) { id }
  }
`;
export const DELETE_QUESTION = gql`
  mutation DeleteQuestionMutation($id: ID!) {
    deleteQuestion(where: { id: $id })
  }
`;
export const RESTORE_QUESTION = gql`
  mutation RestoreQuestionMutation($id: ID!) {
    restoreQuestion(where: { id: $id })
  }
`;
export const CREATE_ANSWER = gql`
  mutation CreateAnswerMutation($data: CreateAnswer!) {
    createAnswer(data: $data) { id }
  }
`;
export const UPDATE_ANSWER = gql`
  mutation UpdateAnswerMutation($id: ID!, $data: UpdateAnswer!) {
    updateAnswer(where: { id: $id }, data: $data) { id }
  }
`;
export const DELETE_ANSWER = gql`
  mutation DeleteAnswerMutation($id: ID!) {
    deleteAnswer(where: { id: $id })
  }
`;
export const RESTORE_ANSWER = gql`
  mutation RestoreAnswerMutation($id: ID!) {
    restoreAnswer(where: { id: $id })
  }
`;
export const MUTATIONS = {
  AnotherObject: {
    delete: DELETE_ANOTHER_OBJECT,
  }
  ,
  SomeObject: {
    create: CREATE_SOME_OBJECT,
    update: UPDATE_SOME_OBJECT,
    delete: DELETE_SOME_OBJECT,
  }
  ,
  Review: {
    create: CREATE_REVIEW,
    update: UPDATE_REVIEW,
    delete: DELETE_REVIEW,
  }
  ,
  Question: {
    create: CREATE_QUESTION,
    update: UPDATE_QUESTION,
    delete: DELETE_QUESTION,
  }
  ,
  Answer: {
    create: CREATE_ANSWER,
    update: UPDATE_ANSWER,
    delete: DELETE_ANSWER,
  }
  ,
}
