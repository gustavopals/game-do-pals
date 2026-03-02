export type EntityId = number;

type ComponentBucket = Map<EntityId, unknown>;

export class EntityStore {
  private nextEntityId = 1;
  private alive = new Set<EntityId>();
  private components = new Map<string, ComponentBucket>();

  createEntity(): EntityId {
    const id = this.nextEntityId;
    this.nextEntityId += 1;
    this.alive.add(id);
    return id;
  }

  destroyEntity(entityId: EntityId): void {
    this.alive.delete(entityId);
    for (const bucket of this.components.values()) {
      bucket.delete(entityId);
    }
  }

  addComponent<T>(entityId: EntityId, key: string, value: T): void {
    const bucket = this.components.get(key) ?? new Map<EntityId, unknown>();
    bucket.set(entityId, value);
    this.components.set(key, bucket);
  }

  getComponent<T>(entityId: EntityId, key: string): T | undefined {
    const bucket = this.components.get(key);
    return bucket?.get(entityId) as T | undefined;
  }

  queryWithAll(keys: string[]): EntityId[] {
    if (keys.length === 0) {
      return [...this.alive];
    }

    const [firstKey, ...rest] = keys;
    const firstBucket = this.components.get(firstKey);
    if (!firstBucket) {
      return [];
    }

    const matches: EntityId[] = [];

    for (const entityId of firstBucket.keys()) {
      if (!this.alive.has(entityId)) {
        continue;
      }

      const hasAll = rest.every((key) => this.components.get(key)?.has(entityId));
      if (hasAll) {
        matches.push(entityId);
      }
    }

    return matches;
  }
}
