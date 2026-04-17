import * as usersService from "../services/users.service.js";

export const fetchUserBySellerId = (sellerId: string) =>
  usersService.proxyMlGetUserBySellerId(sellerId);
