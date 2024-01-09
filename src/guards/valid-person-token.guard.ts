import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { PersonTokenService } from '../person-token/person-token.service';

@Injectable()
export class ValidPersonTokenGuard implements CanActivate {
    constructor(
        private personTokenService: PersonTokenService
    ) {}

    async canActivate(context: ExecutionContext){
        const request = context.switchToHttp().getRequest();
        const personToken = request.query['personToken'];

        if (!personToken) {
            return false;
        }

        return this.personTokenService.isValidToken(personToken);
    }
}
