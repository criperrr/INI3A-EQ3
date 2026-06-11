import * as service from "./market.service";
import { dispatchSuccess } from "@/shared/util/response.helper";
import { SuccessCodes } from "@/shared/util/response.helper";

const createMarket:Handlers.CreateMarket = function (req, res, next) {
  const market = req.body;

}