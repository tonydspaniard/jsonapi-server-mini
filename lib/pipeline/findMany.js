/**
 * @author Sander Steenhuis <info@redsandro.com> (https://www.Redsandro.com)
 * @author Stone Circle <info@stonecircle.ie> (https://www.stonecircle.ie)
 * @license MIT
 */
const serializer	= require('../helpers/serializer')
const parseInclude	= require('../helpers/parseInclude')
const filter		= require('../helpers/filter')

module.exports = (options) => async(req, res, next) => {
	const {
		args,
		model:Model,
	}					= options
	const {
		sample,
		page = {},
	}					= req.query
	const {
		select,
		sort,
	}					= req.jsMini
	const pageLimit		= Math.min(+page.limit || +page.size, Math.max(args.limitMax || 0, 100))
	const limit			= pageLimit || options.find.limit || args.limit || 50
	const offset		= +page.offset || +(page.number || 0) * limit || 0
	const relInclude	= parseInclude(req, options)
	const match			= { ...filter(req), ...req.jsMini.query }
	const find			= Model.find(match).select(select).sort(sort).lean(false).skip(offset).limit(limit)
	const query			= relInclude.reduce((findOne, rel) => findOne.populate(rel), find)
	let results, count, meta = {}

	try {
		if (options.find.query) {
			/*
			 * If a custom query function was specified, all logic is expected to be there.
			 * All we need to do is serialize the response according to the scheme.
			 */
			results = await options.find.query(req, 'findMany')
		}
		else if (sample) {
			/*
			 * Random set is only available through aggregate, so we need to set up
			 * the pipeline a bit differently
			 */
			const size = +sample || 1
			results = Model.aggregate().match(match).sample(size)
			if (Object.keys(sort).length) results = results.sort(sort)
			if (Object.keys(select).length) results = results.project(select)
			results = await results.exec()
			meta = { ...meta, count:size }
			console.log('%j', results)
		}
		else {
			/*
			 * Execute the default query pipeline.
			 */
			results	= await query.exec()
			count	= await Model.countDocuments(match)
			meta = { ...meta, count }
		}

		res.json(serializer(req, results, meta, options))
		return next()
	}
	catch (err) {
		return next(err)
	}
}