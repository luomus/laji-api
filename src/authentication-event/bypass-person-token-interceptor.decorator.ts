import { SetMetadata } from "@nestjs/common";

export const BypassPersonTokenInterceptor = () => SetMetadata("BypassPersonTokenInterceptor", true);
