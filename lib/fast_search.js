lunr.FastSearch = function() {
};

lunr.FastSearch.load = function(serialisedData) {
  var idx = new this

  idx._fields = serialisedData.fields
  idx._ref = serialisedData.ref
  idx.tokenizer = lunr.tokenizer.load(serialisedData.tokenizer)
  idx.pipeline = lunr.Pipeline.load(serialisedData.pipeline)
  idx.tokens = serialisedData.tokens;
  idx.docs = serialisedData.docs;

  var trigramIndex = idx.trigramIndex = {};
  for (var i=0; i<idx.tokens.length; i++) {
    var token = idx.tokens[i][0];
    for (var j=0; j<token.length-2; j++) {
      var trigram = token.substring(j, j+3);
      if (!trigramIndex[trigram]) {
        trigramIndex[trigram] = [];
      }
      trigramIndex[trigram].push(idx.tokens[i]);
    }
    idx.tokens[i][1] = lunr.Index.deltaUnpack(idx.tokens[i][1]);
  }
  return idx;
};

lunr.FastSearch.prototype.filterByTrigrams = function(trigramIndex, token, smallestTrigram) {
  if (smallestTrigram === []) {
    return smallestTrigram;
  }
  if (token.length < 3) {
    return [];
  } else {
    for (var j=0; j<token.length-2; j++) {
      var trigram = token.substring(j, j+3);
      var tokens = trigramIndex[trigram];
      if (!tokens) {
        return [];
      } else if (smallestTrigram === null || tokens.length < smallestTrigram.length) {
        smallestTrigram = tokens;
      }
    }
  }
  return smallestTrigram;
};

lunr.FastSearch.prototype.searchByToken = function(queryToken) {
  var filteredTokens = this.filterByTrigrams(this.trigramIndex, queryToken, this.tokens);
  var hits = [];
  var hitIndex = {};
  for (var i=0; i<filteredTokens.length; i++) {
    var tokenDocTFs = filteredTokens[i];
    var token = tokenDocTFs[0];
    var docs = tokenDocTFs[1];
    var tfs = tokenDocTFs[2];
    var matchScore = 0;
    if (token.indexOf(queryToken) !== -1) {
      matchScore = Math.max(matchScore, 1 - (token.length - queryToken.length) / token.length);
    }
    if (matchScore > 0) {
      for (var j=0; j<docs.length; j++) {
        var doc = docs[j];
        if (!hitIndex[doc]) {
          hitIndex[doc] = {id: doc, ref: this.docs[doc], score: 0};
          hits.push(hitIndex[doc]);
        }
        hitIndex[doc].score += matchScore * tfs[j];
      }
    }
  }
  hits.sort(function(a,b) { return a.id - b.id; });
  return hits;
};

lunr.FastSearch.prototype.mergeHits = function(a, b) {
  var hits = [];
  for (var i=0, j=0; i<a.length && j<b.length;) {
    if (a[i].id === b[j].id) {
      a[i].score += b[j].score;
      hits.push(a[i]);
      i++;
      j++;
    } else if (a[i].id < b[j].id) {
      i++;
    } else {
      j++;
    }
  }
  return hits;
};

lunr.FastSearch.prototype.search = function(query) {
  var queryTokens = this.pipeline.run(this.tokenizer(query));
  queryTokens = queryTokens.filter(function(q) { return q.length >= 3; });
  if (queryTokens.length === 0) {
    return [];
  }
  var hits = this.searchByToken(queryTokens[0]);
  for (var j=1; j<queryTokens.length; j++) {
    hits = this.mergeHits(hits, this.searchByToken(queryTokens[j]));
  }
  hits.sort(function(a,b) { return b.score - a.score; });
  return hits;
};
