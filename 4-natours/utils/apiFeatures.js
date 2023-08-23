class APIFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }

  filter() {
    // 1A) Filtering out complicated operations
    const queryObj = { ...this.queryString };
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    excludedFields.forEach((el) => delete queryObj[el]);

    // 1B) grater/less than equal opertions
    // duration: { gte: '5' } in url >>to be>> duration: { $gte: '5' } for MongoDB
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);
    // RE /b for matching the whole word, g for doing the fucntion entirely

    this.query = this.query.find(JSON.parse(queryStr));

    return this; // return the entire object
  }

  sort() {
    //'price,-ratingsAverage' in url >> '-price -ratingsAverage' for MongoDB
    // '-price' >> sort by price descending
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(',').join(' ');
      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort('-createdAt');
    }

    return this;
  }

  limitFiels() {
    // 'name,duration,price' in url >> 'name duration price' for MongoDB
    if (this.queryString.fields) {
      const fields = this.queryString.fields
        .split(',')
        .filter((field) => field.trim().toLowerCase() !== 'password') // not allow fields=password
        .join(' ');
      this.query = this.query.select(fields);
    }
    this.query = this.query.select('-__v');
    // excluding a specific field by adding '-'
    // {__v: 0} is internal use created by MongoDB

    return this;
  }

  paginate() {
    const page = this.queryString.page * 1 || 1;
    const limit = this.queryString.limit * 1 || 100;
    const skip = (page - 1) * limit;

    this.query = this.query.skip(skip).limit(limit);

    // if (req.query.page) {
    //     const numTours = await Tour.countDocuments();
    //     if (skip >= numTours) throw new Error('This page does not exist');
    // }

    return this;
  }
}

module.exports = APIFeatures;
