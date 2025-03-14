import { logger } from '../services/logger.service.js'

export async function log(req, res, next) {
    console.log('log start');
    
    const { baseUrl, method, body, params } = req
    const logEntry = { baseUrl, method, body, params }
	logger.info(JSON.stringify(logEntry, null, 2))
    console.log('log end');
	next()
}
