import * as questionsService from "../services/questions.service.js";

export const fetchSellerQuestions = () =>
  questionsService.proxyMlGetSellerQuestions();

