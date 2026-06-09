import { dispatchJSON } from '../../shared/util/response.helper';

export default function apiStatus(_req: any, res: import('express').Response, next: Function) {
  const status = {
    version: '1.1',
  }
  return dispatchJSON(status, 200, res);
}