import { SetMetadata } from "@nestjs/common";

export const BypassAccessTokenAuth = () => SetMetadata("BypassAccessTokenAuth", true);
