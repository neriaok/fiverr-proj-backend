import { ObjectId } from 'mongodb'

import { logger } from '../../services/logger.service.js'
import { makeId } from '../../services/util.service.js'
import { dbService } from '../../services/db.service.js'
import { asyncLocalStorage } from '../../services/als.service.js'

const PAGE_SIZE = 3

export const gigService = {
	remove,
	query,
	getById,
	add,
	update,
	addGigMsg,
	removeGigMsg,
}

async function query(filterBy = {}) {
	// console.log('service:', filterBy);
	try {

		const criteria = _buildCriteria(filterBy)
		console.log('criteria', criteria);


		const collection = await dbService.getCollection('gigs')
		const gigs = await collection.find(criteria).toArray()

		return gigs
	} catch (err) {
		logger.error('cannot find gigs', err)
		throw err
	}
}

async function getById(gigId) {
	console.log('getbyid backand');

	try {
		const criteria = { _id: ObjectId.createFromHexString(gigId) }

		const collection = await dbService.getCollection('gig')
		const gig = await collection.findOne(criteria)

		gig.createdAt = gig._id.getTimestamp()
		return gig
	} catch (err) {
		logger.error(`while finding gig ${gigId}`, err)
		throw err
	}
}

async function remove(gigId) {
	const { loggedinUser } = asyncLocalStorage.getStore()
	const { _id: ownerId, isAdmin } = loggedinUser

	try {
		const criteria = {
			_id: ObjectId.createFromHexString(gigId),
		}
		if (!isAdmin) criteria['owner._id'] = ownerId

		const collection = await dbService.getCollection('gig')
		const res = await collection.deleteOne(criteria)

		if (res.deletedCount === 0) throw ('Not your gig')
		return gigId
	} catch (err) {
		logger.error(`cannot remove gig ${gigId}`, err)
		throw err
	}
}

async function add(gig) {
	try {
		const collection = await dbService.getCollection('gig')
		await collection.insertOne(gig)

		return gig
	} catch (err) {
		logger.error('cannot insert gig', err)
		throw err
	}
}

async function update(gig) {
	const gigToSave = { vendor: gig.vendor, speed: gig.speed }

	try {
		const criteria = { _id: ObjectId.createFromHexString(gig._id) }

		const collection = await dbService.getCollection('gig')
		await collection.updateOne(criteria, { $set: gigToSave })

		return gig
	} catch (err) {
		logger.error(`cannot update gig ${gig._id}`, err)
		throw err
	}
}

async function addGigMsg(gigId, msg) {
	try {
		const criteria = { _id: ObjectId.createFromHexString(gigId) }
		msg.id = makeId()

		const collection = await dbService.getCollection('gig')
		await collection.updateOne(criteria, { $push: { msgs: msg } })

		return msg
	} catch (err) {
		logger.error(`cannot add gig msg ${gigId}`, err)
		throw err
	}
}

async function removeGigMsg(gigId, msgId) {
	try {
		const criteria = { _id: ObjectId.createFromHexString(gigId) }

		const collection = await dbService.getCollection('gig')
		await collection.updateOne(criteria, { $pull: { msgs: { id: msgId } } })

		return msgId
	} catch (err) {
		logger.error(`cannot add gig msg ${gigId}`, err)
		throw err
	}
}

function _buildCriteria(filterBy) {
	console.log('criteria', filterBy);

	const criteria = {};
	console.log('before if');

	// If `txt` is provided, search in title and description
	if (filterBy.txt) {
		criteria.$or = [  // Use $or to allow matching either title or description
			{ title: { $regex: filterBy.txt, $options: 'i' } },  // case-insensitive search in title
			{ description: { $regex: filterBy.txt, $options: 'i' } }  // case-insensitive search in description
		];
	}

	// If `price` is provided, filter by price (price is a number)
	if (filterBy.price) {
		if (filterBy.price === 1) {
			console.log('0');
			criteria.price = { $lte: 495 }; // Price less than or equal to 495
		} if (filterBy.price === 495) {
			criteria.price = { $gte: 495, $lte: 1332 }; // Price between 495 and 1332 (inclusive)
		} if (filterBy.price === 1332) {
			criteria.price = { $gte: 1332 }; // Price greater than or equal to 1332
		}
	}

	// If `tag` is provided, match the tags in the `tags` array
	if (filterBy.tag) {
		criteria.tags = { $in: filterBy.tag.split(',') };  // Support multiple tags (comma separated)
	}

	// If `deliveryTime` (or `daysToMake`) is provided, filter by the delivery time (in days)
	if (filterBy.deliveryTime) {
		criteria.daysToMake = { $gte: +filterBy.deliveryTime };  // Greater than or equal to the specified delivery time
	}


	console.log('criteria built:', criteria);
	return criteria;
}

function _buildSort(filterBy) {
	if (!filterBy.sortField) return {}
	return { [filterBy.sortField]: filterBy.sortDir }
}