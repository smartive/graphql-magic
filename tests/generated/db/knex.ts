import { Knex } from 'knex';
import { User, UserInitializer, UserMutator, AnotherObject, AnotherObjectInitializer, AnotherObjectMutator, SomeObject, SomeObjectInitializer, SomeObjectMutator, Reaction, ReactionInitializer, ReactionMutator, Review, ReviewInitializer, ReviewMutator, Question, QuestionInitializer, QuestionMutator, Answer, AnswerInitializer, AnswerMutator } from '.';

declare module 'knex/types/tables' {
  interface Tables {
    'User': Knex.CompositeTableType<User, UserInitializer, UserMutator>,
    'AnotherObject': Knex.CompositeTableType<AnotherObject, AnotherObjectInitializer, AnotherObjectMutator>,
    'SomeObject': Knex.CompositeTableType<SomeObject, SomeObjectInitializer, SomeObjectMutator>,
    'Reaction': Knex.CompositeTableType<Reaction, ReactionInitializer, ReactionMutator>,
    'Review': Knex.CompositeTableType<Review, ReviewInitializer, ReviewMutator>,
    'Question': Knex.CompositeTableType<Question, QuestionInitializer, QuestionMutator>,
    'Answer': Knex.CompositeTableType<Answer, AnswerInitializer, AnswerMutator>,
  }
}