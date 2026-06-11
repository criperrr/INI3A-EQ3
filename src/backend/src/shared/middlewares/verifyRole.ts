import { Roles } from '../types/roles';
import type express from 'express';


function role(role: Roles) {
  
  function handler(req: express.Request, res: express.Response, next: Function) {
    //...
  }
}
