module('fast_search', {
  setup: function () {
    this.corpus = [{
      id: 'a',
      title: 'Mr. Green kills Colonel Mustard',
      body: 'Mr. Green killed Colonel Mustard in the study with the candlestick. Mr. Green is not a very nice fellow.'
    },{
      id: 'b',
      title: 'Plumb waters plant',
      body: 'Professor Plumb has a green plant in his study'
    },{
      id: 'c',
      title: 'Scarlett helps Professor',
      body: 'Miss Scarlett watered Professor Plumbs green plant while he was away from his office last week.'
    }]
  }
})

test('dumping and loading a FastSearch index', function () {
  var idx = new lunr.Index

  idx.field('title', { boost: 10 })
  idx.field('body')

  this.corpus.forEach(function (doc) { idx.add(doc) })

  var dumpedIdx = JSON.stringify(idx.toPackedJSON()),
      clonedIdx = lunr.Index.load(JSON.parse(dumpedIdx)),
      fastSearchIdx = lunr.FastSearch.load(JSON.parse(dumpedIdx))



  deepEqual(idx.search('green plant'), clonedIdx.search('green plant'))
  deepEqual(idx.search('green plant').map(function(d) { return d.ref }), fastSearchIdx.search('green plant').map(function(d) { return d.ref }))
})


test('dumping and loading a FastSearch index with a populated pipeline', function () {
  var idx = lunr(function () {
    this.field('title', { boost: 10 })
    this.field('body')
  })

  this.corpus.forEach(function (doc) { idx.add(doc) })

  var dumpedIdx = JSON.stringify(idx.toPackedJSON()),
      clonedIdx = lunr.Index.load(JSON.parse(dumpedIdx)),
      fastSearchIdx = lunr.FastSearch.load(JSON.parse(dumpedIdx))

  deepEqual(idx.pipeline._stack, clonedIdx.pipeline._stack)
  deepEqual(idx.search('water'), clonedIdx.search('water'))
  deepEqual(idx.search('water').map(function(d) { return d.ref }), fastSearchIdx.search('water').map(function(d) { return d.ref }))
})


test('dumping and loading a FastSearch index with a populated pipeline and quantized TFs', function () {
  var idx = lunr(function () {
    this.field('title', { boost: 10 })
    this.field('body')
  })

  this.corpus.forEach(function (doc) { idx.add(doc) })

  var dumpedIdx = JSON.stringify(idx.toPackedJSON(32)),
      clonedIdx = lunr.Index.load(JSON.parse(dumpedIdx)),
      fastSearchIdx = lunr.FastSearch.load(JSON.parse(dumpedIdx))

  deepEqual(idx.pipeline._stack, clonedIdx.pipeline._stack)
  var tokens = ['water', 'green plant', 'scarlet', 'professor', 'mustard', 'green candlestick', 'database', 'reference metric', ''];
  for (var i=0; i<tokens.length; i++) {
    deepEqual(idx.search(tokens[i]).map(function(d) { return d.ref }), clonedIdx.search(tokens[i]).map(function(d) { return d.ref }))
    deepEqual(idx.search(tokens[i]).map(function(d) { return d.ref }), fastSearchIdx.search(tokens[i]).map(function(d) { return d.ref }))
  }
})
