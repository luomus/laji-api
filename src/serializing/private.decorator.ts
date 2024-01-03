const excludeMetadataKey = Symbol("Private");

/** Mark a property to be excluded when serialized by SerializingInterceptor. */
export function Private() {
	  return Reflect.metadata(excludeMetadataKey, "PRIVATE");
}

export function getPrivateDecorator(target: any, propertyKey: string) {
	  return Reflect.getMetadata(excludeMetadataKey, target, propertyKey);
}
