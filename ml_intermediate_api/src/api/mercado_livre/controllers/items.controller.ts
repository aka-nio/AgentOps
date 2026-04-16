import * as itemsService from "../services/items.service.js";

export const fetchItemById = (itemId: string) =>
  itemsService.proxyMlGetItemById(itemId);
