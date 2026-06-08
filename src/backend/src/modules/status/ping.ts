import { dispatchJSON } from '../../shared/util/response.helper';

export default function ping(_req: any, res: import('express').Response, next: Function) {
  const status = {
    version: '1.1',
    crudStatus: 'user: create , sync, put, patch, delete, red',
  }
  return dispatchJSON(status, 201, res);
}