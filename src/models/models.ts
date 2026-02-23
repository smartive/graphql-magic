import { pluralize } from 'inflection';
import cloneDeep from 'lodash/cloneDeep';
import kebabCase from 'lodash/kebabCase';
import omit from 'lodash/omit';
import pick from 'lodash/pick';
import {
  CustomFieldDefinition,
  EnumFieldDefinition,
  Field,
  FloatFieldDefinition,
  IDFieldDefinition,
  InputModelDefinition,
  IntFieldDefinition,
  InterfaceModelDefinition,
  JsonFieldDefinition,
  ObjectModelDefinition,
  OrderBy,
  PrimitiveFieldDefinition,
  RawEnumModelDefinition,
  StringFieldDefinition,
  UnionModelDefinition,
  UploadFieldDefinition,
} from '..';
import {
  BooleanFieldDefinition,
  DateTimeFieldDefinition,
  EntityFieldDefinition,
  EntityModelDefinition,
  EnumModelDefinition,
  ModelDefinition,
  ModelDefinitions,
  ObjectFieldDefinition,
  RelationFieldDefinition,
} from './model-definitions';
import {
  get,
  getLabel,
  isManyToManyRelationEntityModel,
  isRelation,
  summonByName,
  typeToField,
  validateCheckConstraint,
} from './utils';

// These might one day become classes

export type ObjectField = ObjectFieldDefinition;
export type EntityField = EntityFieldDefinition;
export type PrimitiveField = PrimitiveFieldDefinition;
export type IDField = IDFieldDefinition;
export type BooleanField = BooleanFieldDefinition;
export type StringField = StringFieldDefinition;
export type DateTimeField = DateTimeFieldDefinition;
export type IntField = IntFieldDefinition;
export type FloatField = FloatFieldDefinition;
export type UploadField = UploadFieldDefinition;
export type JsonField = JsonFieldDefinition;
export type EnumField = EnumFieldDefinition;
export type CustomField = CustomFieldDefinition;
export type RelationField = Omit<RelationFieldDefinition, 'foreignKey'> & { foreignKey: string };

export class Models {
  public models: Model[];
  private modelsByName: Record<string, Model> = {};
  public scalars: ScalarModel[];
  public rawEnums: RawEnumModel[];
  public enums: EnumModel[];
  public inputs: InputModel[];
  public interfaces: InterfaceModel[];
  public objects: ObjectModel[];
  public entities: EntityModel[];
  public unions: UnionModel[];
  public definitions: ModelDefinitions;

  constructor(definitions: ModelDefinitions) {
    this.definitions = cloneDeep(definitions);
    this.definitions.push(
      {
        kind: 'scalar',
        name: 'DateTime',
      },
      { kind: 'scalar', name: 'Upload' },
      {
        kind: 'raw-enum',
        name: 'Order',
        values: ['ASC', 'DESC'],
      },
    );
    const entities = this.definitions.filter(isEntityModelDefinition);

    for (const entity of entities) {
      if (entity.root) {
        this.definitions.push({
          kind: 'enum',
          name: `${entity.name}Type`,
          values: entities.filter((subModel) => subModel.parent === entity.name).map((subModel) => subModel.name),
        });
      }

      entity.fields = [
        {
          name: 'id',
          type: 'ID',
          nonNull: true,
          unique: true,
          primary: true,
          generated: true,
        },
        ...(entity.root
          ? [
              {
                name: 'type',
                kind: 'enum',
                type: `${entity.name}Type`,
                nonNull: true,
                generated: true,
              } satisfies EntityFieldDefinition,
            ]
          : []),
        ...entity.fields,
        ...(entity.creatable
          ? [
              {
                name: 'createdAt',
                type: 'DateTime',
                nonNull: true,
                orderable: true,
                generated: true,
                ...(typeof entity.creatable === 'object' && entity.creatable.createdAt),
              } satisfies DateTimeFieldDefinition,
              {
                name: 'createdBy',
                kind: 'relation',
                type: 'User',
                nonNull: true,
                reverse: `created${getModelPlural(entity)}`,
                generated: true,
                ...(typeof entity.creatable === 'object' && entity.creatable.createdBy),
              } satisfies RelationFieldDefinition,
            ]
          : []),
        ...(entity.updatable
          ? [
              {
                name: 'updatedAt',
                type: 'DateTime',
                nonNull: true,
                orderable: true,
                generated: true,
                ...(typeof entity.updatable === 'object' && entity.updatable.updatedAt),
              } satisfies DateTimeFieldDefinition,
              {
                name: 'updatedBy',
                kind: 'relation',
                type: 'User',
                nonNull: true,
                reverse: `updated${getModelPlural(entity)}`,
                generated: true,
                ...(typeof entity.updatable === 'object' && entity.updatable.updatedBy),
              } satisfies RelationFieldDefinition,
            ]
          : []),
        ...(entity.deletable
          ? [
              {
                name: 'deleted',
                type: 'Boolean',
                nonNull: true,
                defaultValue: false,
                filterable: { default: false },
                generated: true,
                ...(typeof entity.deletable === 'object' && entity.deletable.deleted),
              } satisfies BooleanFieldDefinition,
              {
                name: 'deletedAt',
                type: 'DateTime',
                orderable: true,
                generated: true,
                ...(typeof entity.deletable === 'object' && entity.deletable.deletedAt),
              } satisfies DateTimeFieldDefinition,
              {
                name: 'deletedBy',
                kind: 'relation',
                type: 'User',
                reverse: `deleted${getModelPlural(entity)}`,
                generated: true,
                ...(typeof entity.deletable === 'object' && entity.deletable.deletedBy),
              } satisfies RelationFieldDefinition,
              {
                name: 'deleteRootType',
                type: 'String',
                generated: true,
              } satisfies StringFieldDefinition,

              {
                name: 'deleteRootId',
                type: 'ID',
                generated: true,
              } satisfies IDFieldDefinition,
            ]
          : []),
      ];

      for (const field of entity.fields) {
        if (field.kind === 'relation') {
          field.foreignKey = field.foreignKey || `${field.name}Id`;
        }
      }
    }

    for (const model of entities) {
      if (model.parent) {
        const parent = summonByName(entities, model.parent);
        const INHERITED_FIELDS = ['queriable', 'listQueriable', 'creatable', 'updatable', 'deletable'];
        Object.assign(model, pick(parent, INHERITED_FIELDS), pick(model, INHERITED_FIELDS));

        model.fields = [
          ...parent.fields.map((field) => ({
            ...field,
            ...(field.kind === 'relation' &&
              field.reverse && { reverse: field.reverse.replace(getModelPlural(parent), getModelPlural(model)) }),
            ...model.fields.find((childField) => childField.name === field.name),
            inherited: true,
          })),
          ...model.fields.filter((field) => !parent.fields.some((parentField) => parentField.name === field.name)),
        ];
      }
    }

    this.models = this.definitions.map(
      (definition) => new (MODEL_KIND_TO_CLASS_MAPPING[definition.kind] as any)(this, definition),
    );
    for (const model of this.models) {
      this.modelsByName[model.name] = model;
    }
    this.entities = this.models.filter((model): model is EntityModel => model instanceof EntityModel);
    this.enums = this.models.filter((model): model is EnumModel => model instanceof EnumModel);
    this.inputs = this.models.filter((model): model is InputModel => model instanceof InputModel);
    this.interfaces = this.models.filter((model): model is InterfaceModel => model instanceof InterfaceModel);
    this.objects = this.models.filter((model): model is ObjectModel => model instanceof ObjectModel);
    this.rawEnums = this.models.filter((model): model is RawEnumModel => model instanceof RawEnumModel);
    this.scalars = this.models.filter((model): model is ScalarModel => model instanceof ScalarModel);
    this.unions = this.models.filter((model): model is UnionModel => model instanceof UnionModel);
  }

  public getModel<K extends keyof ModelKindToClassMapping>(name: string, kind?: K): ModelKindToClassMapping[K] {
    const model = get(this.modelsByName, name);
    if (!kind) {
      return model as ModelKindToClassMapping[K];
    }

    const expectedType = MODEL_KIND_TO_CLASS_MAPPING[kind];
    if (!(model instanceof expectedType)) {
      throw new Error(`Model ${name} is not of kind ${kind}.`);
    }

    return model as ModelKindToClassMapping[K];
  }
}

export abstract class Model {
  name: string;
  plural: string;
  description: string;

  constructor(
    public models: Models,
    definition: ModelDefinition,
  ) {
    Object.assign(this, definition);
    this.plural = definition.plural || pluralize(definition.name);
  }
}

export class ScalarModel extends Model {
  kind: 'scalar';
}

export class UnionModel extends Model {
  kind: 'union';
  types: string[];

  constructor(models: Models, definition: UnionModelDefinition) {
    super(models, definition);
    Object.assign(this, omit(definition, 'name', 'plural', 'description'));
  }
}
export class EnumModel extends Model {
  kind: 'enum';
  values: string[];
  deleted?: true;

  constructor(models: Models, definition: EnumModelDefinition) {
    super(models, definition);
    Object.assign(this, omit(definition, 'name', 'plural', 'description'));
  }
}

export class RawEnumModel extends Model {
  kind: 'raw-enum';
  values: string[];

  constructor(models: Models, definition: RawEnumModelDefinition) {
    super(models, definition);
    Object.assign(this, omit(definition, 'name', 'plural', 'description'));
  }
}

export class InterfaceModel extends Model {
  kind: 'interface';
  fields: EntityField[];

  constructor(models: Models, definition: InterfaceModelDefinition) {
    super(models, definition);
    Object.assign(this, omit(definition, 'name', 'plural', 'description'));
  }
}

export class InputModel extends Model {
  kind: 'model';
  fields: ObjectField[];

  constructor(models: Models, definition: InputModelDefinition) {
    super(models, definition);
    Object.assign(this, omit(definition, 'name', 'plural', 'description'));
  }
}

export class ObjectModel extends Model {
  kind: 'object';
  fields: ObjectField[];

  constructor(models: Models, definition: ObjectModelDefinition) {
    super(models, definition);
    Object.assign(this, omit(definition, 'name', 'plural', 'description'));
  }
}

export class EntityModel extends Model {
  kind: 'entity';
  root?: boolean;
  parent?: string;
  interfaces?: string[];
  queriable?: boolean;
  listQueriable?: boolean | { args?: readonly Field[] };
  creatable?: boolean | { createdBy?: Partial<RelationFieldDefinition>; createdAt?: Partial<DateTimeFieldDefinition> };
  updatable?: boolean | { updatedBy?: Partial<RelationFieldDefinition>; updatedAt?: Partial<DateTimeFieldDefinition> };
  deletable?:
    | boolean
    | {
        deleted?: Partial<BooleanFieldDefinition>;
        deletedBy?: Partial<RelationFieldDefinition>;
        deletedAt?: Partial<DateTimeFieldDefinition>;
      };
  aggregatable?: boolean;
  displayField?: string;
  defaultOrderBy?: OrderBy[];
  fields: EntityField[];

  constraints?: { kind: 'check'; name: string; expression: string }[];

  // temporary fields for the generation of migrations
  deleted?: true;
  oldName?: string;

  fieldsByName: Record<string, EntityField> = {};
  fieldsByColumnName: Record<string, EntityField> = {};
  private _relations: NormalRelation[];
  private _relationsByName: Record<string, NormalRelation>;
  private _reverseRelations: ReverseRelation[];
  private _reverseRelationsByName: Record<string, ReverseRelation>;
  private _manyToManyRelations: ManyToManyRelation[];
  private _manyToManyRelationsByName: Record<string, ManyToManyRelation>;
  private _manyToManyRelation: ManyToManyRelation;
  public pluralField: string;
  public slug: string;
  public labelPlural: string;
  public label: string;
  private _parentModel: EntityModel;

  constructor(models: Models, definition: EntityModelDefinition) {
    super(models, definition);
    Object.assign(this, omit(definition, 'name', 'plural', 'description'));
    this.pluralField = typeToField(this.plural);
    this.slug = kebabCase(this.plural);
    this.labelPlural = getLabel(this.plural);
    this.label = getLabel(definition.name);
    for (const field of definition.fields) {
      this.fieldsByName[field.name] = field;
    }
    if (this.constraints?.length) {
      for (const constraint of this.constraints) {
        if (constraint.kind === 'check') {
          validateCheckConstraint(this, constraint);
        }
      }
    }
  }

  public getField(name: string) {
    return get(this.fieldsByName, name);
  }

  public get relations() {
    if (!this._relations) {
      this._relations = this.fields
        .filter(isRelation)
        .map((relationField) => new NormalRelation(this, relationField, this.models.getModel(relationField.type, 'entity')));
    }

    return this._relations;
  }

  public get relationsByName() {
    if (!this._relationsByName) {
      this._relationsByName = {};
      for (const relation of this.relations) {
        this._relationsByName[relation.name] = relation;
      }
    }

    return this._relationsByName;
  }

  public getRelation(name: string) {
    return get(this.relationsByName, name);
  }

  public get reverseRelations() {
    if (!this._reverseRelations) {
      this._reverseRelations = this.models.entities.flatMap((model) =>
        model.relations
          .filter((relation) => relation.targetModel.name === this.name || relation.targetModel.name === this.rootModel.name)
          .map((relation) => relation.reverse),
      );
    }

    return this._reverseRelations;
  }

  public get reverseRelationsByName() {
    if (!this._reverseRelationsByName) {
      this._reverseRelationsByName = {};
      for (const reverseRelation of this.reverseRelations) {
        this._reverseRelationsByName[reverseRelation.name] = reverseRelation;
      }
    }

    return this._reverseRelationsByName;
  }

  public getReverseRelation(name: string) {
    return get(this.reverseRelationsByName, name);
  }

  public get isManyToManyRelation() {
    return isManyToManyRelationEntityModel(this);
  }

  public get asManyToManyRelation() {
    if (!this._manyToManyRelation) {
      if (!this.isManyToManyRelation) {
        throw new Error(`${this.name} is not a many-to-many relation.`);
      }

      this._manyToManyRelation = new ManyToManyRelation(this.relations[0].reverse, this.relations[1]);
    }

    return this._manyToManyRelation;
  }

  public get manyToManyRelations() {
    if (!this._manyToManyRelations) {
      this._manyToManyRelations = [];
      for (const relationFromSource of this.reverseRelations) {
        const relationToTarget = relationFromSource.targetModel.relations.find(
          (relation) => !relation.field.generated && relation.field.name !== relationFromSource.field.name,
        );
        if (!relationToTarget) {
          continue;
        }

        const inapplicableFields = relationFromSource.targetModel.fields.filter(
          (otherField) =>
            !otherField.generated && ![relationFromSource.field.name, relationToTarget.field.name].includes(otherField.name),
        );
        if (inapplicableFields.length) {
          continue;
        }

        this._manyToManyRelations.push(new ManyToManyRelation(relationFromSource, relationToTarget));
      }
    }

    return this._manyToManyRelations;
  }

  public get manyToManyRelationsByName() {
    if (!this._manyToManyRelationsByName) {
      this._manyToManyRelationsByName = {};
      for (const manyToManyRelation of this.manyToManyRelations) {
        this._manyToManyRelationsByName[manyToManyRelation.name] = manyToManyRelation;
      }
    }

    return this._manyToManyRelationsByName;
  }

  public getManyToManyRelation(name: string) {
    return get(this.manyToManyRelationsByName, name);
  }

  public get parentModel() {
    if (this.parent) {
      if (!this._parentModel) {
        this._parentModel = this.models.getModel(this.parent, 'entity');
      }

      return this._parentModel;
    }
  }

  public get rootModel() {
    return this.parentModel || this;
  }
}

const MODEL_KIND_TO_CLASS_MAPPING = {
  entity: EntityModel,
  enum: EnumModel,
  input: InputModel,
  interface: InterfaceModel,
  object: ObjectModel,
  'raw-enum': RawEnumModel,
  scalar: ScalarModel,
  union: UnionModel,
};

type ModelKindToClassMapping = {
  [K in keyof typeof MODEL_KIND_TO_CLASS_MAPPING]: InstanceType<(typeof MODEL_KIND_TO_CLASS_MAPPING)[K]>;
};

export abstract class Relation {
  constructor(
    public name: string,
    public sourceModel: EntityModel,
    public field: RelationField,
    public targetModel: EntityModel,
  ) {}
}

export class NormalRelation extends Relation {
  public reverse: ReverseRelation;
  public isReverse = false as const;

  constructor(
    sourceModel: EntityModel,
    public field: RelationField,
    targetModel: EntityModel,
  ) {
    super(field.name, sourceModel, field, targetModel);
    this.reverse = new ReverseRelation(this);
  }
}

export class ReverseRelation extends Relation {
  public isReverse = true as const;

  constructor(public reverse: NormalRelation) {
    super(
      reverse.field.reverse ||
        (reverse.field.toOne ? typeToField(reverse.sourceModel.name) : reverse.sourceModel.pluralField),
      reverse.targetModel,
      reverse.field,
      reverse.sourceModel,
    );
  }
}

export class ManyToManyRelation {
  public name: string;
  public sourceModel: EntityModel;
  public relationFromSource: ReverseRelation;
  public relationModel: EntityModel;
  public relationToTarget: NormalRelation;
  public targetModel: EntityModel;

  constructor(relationFromSource: ReverseRelation, relationToTarget: NormalRelation) {
    this.name = relationFromSource.name;
    this.sourceModel = relationFromSource.sourceModel;
    this.relationFromSource = relationFromSource;
    this.relationModel = relationFromSource.targetModel;
    if (this.relationModel !== relationToTarget.sourceModel) {
      throw new Error(`Relation model is ambiguous.`);
    }
    this.relationToTarget = relationToTarget;
    this.targetModel = relationToTarget.targetModel;
  }
}

const isEntityModelDefinition = (definition: ModelDefinition): definition is EntityModelDefinition =>
  definition.kind === 'entity';

const getModelPlural = (model: EntityModelDefinition) => model.plural || pluralize(model.name);
