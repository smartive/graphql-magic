import { gql } from "./gql";
export const FIND_ANOTHER_OBJECT_ADMIN = gql`
query FindAnotherObjectADMIN($where: AnotherObjectWhere!, $orderBy: [AnotherObjectOrderBy!]) {
  data: anotherObjects(limit: 1, where: $where, orderBy: $orderBy) {
    id,name,deleted,deletedAt
  }
}
`;
export const FIND_ANOTHER_OBJECT_USER = gql`
query FindAnotherObjectUSER($where: AnotherObjectWhere!, $orderBy: [AnotherObjectOrderBy!]) {
  data: anotherObjects(limit: 1, where: $where, orderBy: $orderBy) {
    id,name,deleted,deletedAt
  }
}
`;
export const FIND_ANOTHER_OBJECT = {
  ADMIN: FIND_ANOTHER_OBJECT_ADMIN,
  USER: FIND_ANOTHER_OBJECT_USER,
}
;
export const LIST_ANOTHER_OBJECT_ADMIN = gql`
query AnotherObjectsListADMIN(
  
  $limit: Int!,
  $where: AnotherObjectWhere!,
  
) {
  
    data: anotherObjects(limit: $limit, where: $where, ) {
      
display: name

      id,name,deleted,deletedAt
      
      
      
    }
  
}
`;
export const LIST_ANOTHER_OBJECT_USER = gql`
query AnotherObjectsListUSER(
  
  $limit: Int!,
  $where: AnotherObjectWhere!,
  
) {
  
    data: anotherObjects(limit: $limit, where: $where, ) {
      
display: name

      id,name,deleted,deletedAt
      
      
      
    }
  
}
`;
export const LIST_QUERIES_ANOTHER_OBJECT = {
  ADMIN: LIST_ANOTHER_OBJECT_ADMIN,
  USER: LIST_ANOTHER_OBJECT_USER,
}
;
export const UPDATE_QUERY_SOME_OBJECT_ADMIN = gql`
query UpdateQuerySomeObjectADMIN ($id: ID!) {
  data: someObject(where: { id: $id }) {
    id
    
    
    
  }
}
`;
export const UPDATE_QUERY_SOME_OBJECT_USER = gql`
query UpdateQuerySomeObjectUSER ($id: ID!) {
  data: someObject(where: { id: $id }) {
    id
    
    
    
  }
}
`;
export const UPDATE_QUERIES_SOME_OBJECT = {
  ADMIN: UPDATE_QUERY_SOME_OBJECT_ADMIN,
  USER: UPDATE_QUERY_SOME_OBJECT_USER,
}
;
export const FIND_SOME_OBJECT_ADMIN = gql`
query FindSomeObjectADMIN($where: SomeObjectWhere!, $orderBy: [SomeObjectOrderBy!]) {
  data: manyObjects(limit: 1, where: $where, orderBy: $orderBy) {
    id,field,float,list,xyz,createdAt,updatedAt,deleted,deletedAt
  }
}
`;
export const FIND_SOME_OBJECT_USER = gql`
query FindSomeObjectUSER($where: SomeObjectWhere!, $orderBy: [SomeObjectOrderBy!]) {
  data: manyObjects(limit: 1, where: $where, orderBy: $orderBy) {
    id,field,float,list,xyz,createdAt,updatedAt,deleted,deletedAt
  }
}
`;
export const FIND_SOME_OBJECT = {
  ADMIN: FIND_SOME_OBJECT_ADMIN,
  USER: FIND_SOME_OBJECT_USER,
}
;
export const LIST_SOME_OBJECT_ADMIN = gql`
query ManyObjectsListADMIN(
  
  $limit: Int!,
  $where: SomeObjectWhere!,
  $search: String,
) {
  
    data: manyObjects(limit: $limit, where: $where, , search: $search) {
      


      id,field,float,list,xyz,createdAt,updatedAt,deleted,deletedAt
      
      
      
    }
  
}
`;
export const LIST_SOME_OBJECT_USER = gql`
query ManyObjectsListUSER(
  
  $limit: Int!,
  $where: SomeObjectWhere!,
  $search: String,
) {
  
    data: manyObjects(limit: $limit, where: $where, , search: $search) {
      


      id,field,float,list,xyz,createdAt,updatedAt,deleted,deletedAt
      
      
      
    }
  
}
`;
export const LIST_QUERIES_SOME_OBJECT = {
  ADMIN: LIST_SOME_OBJECT_ADMIN,
  USER: LIST_SOME_OBJECT_USER,
}
;
export const UPDATE_QUERY_REACTION_ADMIN = gql`
query UpdateQueryReactionADMIN ($id: ID!) {
  data: reaction(where: { id: $id }) {
    id
    
    
    
  }
}
`;
export const UPDATE_QUERY_REACTION_USER = gql`
query UpdateQueryReactionUSER ($id: ID!) {
  data: reaction(where: { id: $id }) {
    id
    
    
    
  }
}
`;
export const UPDATE_QUERIES_REACTION = {
  ADMIN: UPDATE_QUERY_REACTION_ADMIN,
  USER: UPDATE_QUERY_REACTION_USER,
}
;
export const FIND_REACTION_ADMIN = gql`
query FindReactionADMIN($where: ReactionWhere!, $orderBy: [ReactionOrderBy!]) {
  data: reactions(limit: 1, where: $where, orderBy: $orderBy) {
    id,type,content,createdAt,updatedAt,deleted,deletedAt
  }
}
`;
export const FIND_REACTION_USER = gql`
query FindReactionUSER($where: ReactionWhere!, $orderBy: [ReactionOrderBy!]) {
  data: reactions(limit: 1, where: $where, orderBy: $orderBy) {
    id,type,content,createdAt,updatedAt,deleted,deletedAt
  }
}
`;
export const FIND_REACTION = {
  ADMIN: FIND_REACTION_ADMIN,
  USER: FIND_REACTION_USER,
}
;
export const LIST_REACTION_ADMIN = gql`
query ReactionsListADMIN(
  
  $limit: Int!,
  $where: ReactionWhere!,
  
) {
  
    data: reactions(limit: $limit, where: $where, ) {
      


      id,type,content,createdAt,updatedAt,deleted,deletedAt
      
      
      
    }
  
}
`;
export const LIST_REACTION_USER = gql`
query ReactionsListUSER(
  
  $limit: Int!,
  $where: ReactionWhere!,
  
) {
  
    data: reactions(limit: $limit, where: $where, ) {
      


      id,type,content,createdAt,updatedAt,deleted,deletedAt
      
      
      
    }
  
}
`;
export const LIST_QUERIES_REACTION = {
  ADMIN: LIST_REACTION_ADMIN,
  USER: LIST_REACTION_USER,
}
;
export const UPDATE_QUERY_REVIEW_ADMIN = gql`
query UpdateQueryReviewADMIN ($id: ID!) {
  data: review(where: { id: $id }) {
    id
    
    
    
  }
}
`;
export const UPDATE_QUERY_REVIEW_USER = gql`
query UpdateQueryReviewUSER ($id: ID!) {
  data: review(where: { id: $id }) {
    id
    
    
    
  }
}
`;
export const UPDATE_QUERIES_REVIEW = {
  ADMIN: UPDATE_QUERY_REVIEW_ADMIN,
  USER: UPDATE_QUERY_REVIEW_USER,
}
;
export const FIND_REVIEW_ADMIN = gql`
query FindReviewADMIN($where: ReviewWhere!, $orderBy: [ReviewOrderBy!]) {
  data: reviews(limit: 1, where: $where, orderBy: $orderBy) {
    id,type,content,createdAt,updatedAt,deleted,deletedAt,rating
  }
}
`;
export const FIND_REVIEW_USER = gql`
query FindReviewUSER($where: ReviewWhere!, $orderBy: [ReviewOrderBy!]) {
  data: reviews(limit: 1, where: $where, orderBy: $orderBy) {
    id,type,content,createdAt,updatedAt,deleted,deletedAt,rating
  }
}
`;
export const FIND_REVIEW = {
  ADMIN: FIND_REVIEW_ADMIN,
  USER: FIND_REVIEW_USER,
}
;
export const LIST_REVIEW_ADMIN = gql`
query ReviewsListADMIN(
  
  $limit: Int!,
  $where: ReviewWhere!,
  
) {
  
    data: reviews(limit: $limit, where: $where, ) {
      


      id,type,content,createdAt,updatedAt,deleted,deletedAt,rating
      
      
      
    }
  
}
`;
export const LIST_REVIEW_USER = gql`
query ReviewsListUSER(
  
  $limit: Int!,
  $where: ReviewWhere!,
  
) {
  
    data: reviews(limit: $limit, where: $where, ) {
      


      id,type,content,createdAt,updatedAt,deleted,deletedAt,rating
      
      
      
    }
  
}
`;
export const LIST_QUERIES_REVIEW = {
  ADMIN: LIST_REVIEW_ADMIN,
  USER: LIST_REVIEW_USER,
}
;
export const UPDATE_QUERY_QUESTION_ADMIN = gql`
query UpdateQueryQuestionADMIN ($id: ID!) {
  data: question(where: { id: $id }) {
    id
    
    
    
  }
}
`;
export const UPDATE_QUERY_QUESTION_USER = gql`
query UpdateQueryQuestionUSER ($id: ID!) {
  data: question(where: { id: $id }) {
    id
    
    
    
  }
}
`;
export const UPDATE_QUERIES_QUESTION = {
  ADMIN: UPDATE_QUERY_QUESTION_ADMIN,
  USER: UPDATE_QUERY_QUESTION_USER,
}
;
export const FIND_QUESTION_ADMIN = gql`
query FindQuestionADMIN($where: QuestionWhere!, $orderBy: [QuestionOrderBy!]) {
  data: questions(limit: 1, where: $where, orderBy: $orderBy) {
    id,type,content,createdAt,updatedAt,deleted,deletedAt
  }
}
`;
export const FIND_QUESTION_USER = gql`
query FindQuestionUSER($where: QuestionWhere!, $orderBy: [QuestionOrderBy!]) {
  data: questions(limit: 1, where: $where, orderBy: $orderBy) {
    id,type,content,createdAt,updatedAt,deleted,deletedAt
  }
}
`;
export const FIND_QUESTION = {
  ADMIN: FIND_QUESTION_ADMIN,
  USER: FIND_QUESTION_USER,
}
;
export const LIST_QUESTION_ADMIN = gql`
query QuestionsListADMIN(
  
  $limit: Int!,
  $where: QuestionWhere!,
  
) {
  
    data: questions(limit: $limit, where: $where, ) {
      


      id,type,content,createdAt,updatedAt,deleted,deletedAt
      
      
      
    }
  
}
`;
export const LIST_QUESTION_USER = gql`
query QuestionsListUSER(
  
  $limit: Int!,
  $where: QuestionWhere!,
  
) {
  
    data: questions(limit: $limit, where: $where, ) {
      


      id,type,content,createdAt,updatedAt,deleted,deletedAt
      
      
      
    }
  
}
`;
export const LIST_QUERIES_QUESTION = {
  ADMIN: LIST_QUESTION_ADMIN,
  USER: LIST_QUESTION_USER,
}
;
export const UPDATE_QUERY_ANSWER_ADMIN = gql`
query UpdateQueryAnswerADMIN ($id: ID!) {
  data: answer(where: { id: $id }) {
    id
    
    
    
  }
}
`;
export const UPDATE_QUERY_ANSWER_USER = gql`
query UpdateQueryAnswerUSER ($id: ID!) {
  data: answer(where: { id: $id }) {
    id
    
    
    
  }
}
`;
export const UPDATE_QUERIES_ANSWER = {
  ADMIN: UPDATE_QUERY_ANSWER_ADMIN,
  USER: UPDATE_QUERY_ANSWER_USER,
}
;
export const FIND_ANSWER_ADMIN = gql`
query FindAnswerADMIN($where: AnswerWhere!, $orderBy: [AnswerOrderBy!]) {
  data: answers(limit: 1, where: $where, orderBy: $orderBy) {
    id,type,content,createdAt,updatedAt,deleted,deletedAt
  }
}
`;
export const FIND_ANSWER_USER = gql`
query FindAnswerUSER($where: AnswerWhere!, $orderBy: [AnswerOrderBy!]) {
  data: answers(limit: 1, where: $where, orderBy: $orderBy) {
    id,type,content,createdAt,updatedAt,deleted,deletedAt
  }
}
`;
export const FIND_ANSWER = {
  ADMIN: FIND_ANSWER_ADMIN,
  USER: FIND_ANSWER_USER,
}
;
export const LIST_ANSWER_ADMIN = gql`
query AnswersListADMIN(
  
  $limit: Int!,
  $where: AnswerWhere!,
  
) {
  
    data: answers(limit: $limit, where: $where, ) {
      


      id,type,content,createdAt,updatedAt,deleted,deletedAt
      
      
      
    }
  
}
`;
export const LIST_ANSWER_USER = gql`
query AnswersListUSER(
  
  $limit: Int!,
  $where: AnswerWhere!,
  
) {
  
    data: answers(limit: $limit, where: $where, ) {
      


      id,type,content,createdAt,updatedAt,deleted,deletedAt
      
      
      
    }
  
}
`;
export const LIST_QUERIES_ANSWER = {
  ADMIN: LIST_ANSWER_ADMIN,
  USER: LIST_ANSWER_USER,
}
;
export const UPDATE_QUERIES = {
  SomeObject: {
    ADMIN: UPDATE_QUERY_SOME_OBJECT_ADMIN,
    USER: UPDATE_QUERY_SOME_OBJECT_USER,
  }
  ,
  Reaction: {
    ADMIN: UPDATE_QUERY_REACTION_ADMIN,
    USER: UPDATE_QUERY_REACTION_USER,
  }
  ,
  Review: {
    ADMIN: UPDATE_QUERY_REVIEW_ADMIN,
    USER: UPDATE_QUERY_REVIEW_USER,
  }
  ,
  Question: {
    ADMIN: UPDATE_QUERY_QUESTION_ADMIN,
    USER: UPDATE_QUERY_QUESTION_USER,
  }
  ,
  Answer: {
    ADMIN: UPDATE_QUERY_ANSWER_ADMIN,
    USER: UPDATE_QUERY_ANSWER_USER,
  }
  ,
}
;
export const FIND_QUERIES = {
  AnotherObject: FIND_ANOTHER_OBJECT,
  SomeObject: FIND_SOME_OBJECT,
  Reaction: FIND_REACTION,
  Review: FIND_REVIEW,
  Question: FIND_QUESTION,
  Answer: FIND_ANSWER,
}
;



















