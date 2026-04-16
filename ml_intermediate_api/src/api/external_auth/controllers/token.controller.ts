import * as externalAuthService from "../services/externalAuth.service.js";

export const authenticateWithExternalApi = () =>
  externalAuthService.getExternalAuthToken(undefined);

