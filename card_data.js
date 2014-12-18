var CardData = function (default_rule_count, default_example_count, data_from_uri) {
  // We store the data in this format:
  // [ CardGrid ]
  //
  // CardGrid
  // {
  //   name: string
  //   rules: [Rules]
  //   examples: [Examples]
  //   exceptions: {}
  //   cardScores: {}
  // }
  //
  // Rule 
  // {
  //   target: string
  //   source: string
  // }
  // Example
  // {
  //   target: string
  //   source: string
  // }
  var card_data;

  function hashRuleExample(rule) {
    return JSON.stringify(rule);
  }

  function sourceTargetObjListFromList(source_list, target_list) {
    return d3.zip(source_list, target_list).map(function (d) {
      return {
        source: d[0],
        target: d[1]
      }
    });
  }

  // examples
  function addBlankExampleToCardGrid(cardGrid) {
    cardGrid.examples.push({
      target: '',
      source: ''
    });
  }

  function addBlankExample(index) {
    addBlankExampleToCardGrid(card_data[index]);
  }

  function updateExamples(gridIndex, source_examples, target_examples) {
    card_data[gridIndex].examples = sourceTargetObjListFromList(source_examples, target_examples);
  }

  //rules
  function addBlankRuleToCardGrid(cardGrid) {
    cardGrid.rules.push({
      target: '[term]',
      source: '[term]'
    });
  }

  function addBlankRule(index) {
    addBlankRuleToCardGrid(card_data[index]);
  }

  function updateRules(gridIndex, source_rules, target_rules) {
    card_data[gridIndex].rules = sourceTargetObjListFromList(source_rules, target_rules);
  }


  // grids
  function addGrid() {
    card_data.push(blankData());
  }

  function setGridName(index, name) {
    card_data[index].name = name;
  }

  function getGridName(index) {
    return card_data[index].name;
  }

  function gridCount() {
    return card_data.length;
  }

  // scores
  function getCardScore(index, source_data) {
    return card_data[index].cardScores[hashRuleExample(source_data)]
  }

  function updateCardScore(cardData, score) {
    // TODO: this is complicated, rework
    if (!card_data[cardData.gridIndex].cardScores.hasOwnProperty(hashRuleExample(cardData))) {
      card_data[cardData.gridIndex].cardScores[hashRuleExample(cardData)] = [];
    }

    card_data[cardData.gridIndex].cardScores[hashRuleExample(cardData)].push(score);
  }

  // exceptions
  function updateException(gridIndex, data, new_exception) {
    card_data[gridIndex].exceptions[hashRuleExample(data)] = new_exception;
  }

  function getException(gridIndex, data) {
    return card_data[gridIndex].exceptions[hashRuleExample(data)];
  }

  function hasException(gridIndex, data) {
    return card_data[gridIndex].exceptions.hasOwnProperty(hashRuleExample(data))
  }


  function blankData() {
    var rule_i,
      example_i;

    var dataInfo = {
      name: "",
      rules: [],
      examples: [],
      exceptions: {},
      cardScores: {}
    };

    for (rule_i = 0; rule_i < default_rule_count; rule_i++) {
      addBlankRuleToCardGrid(dataInfo);
    }

    for (example_i = 0; example_i < default_example_count; example_i++) {
      addBlankExampleToCardGrid(dataInfo);
    }
    return dataInfo;
  }

  function getData(index) {
    return card_data[index];
  }

  function initAllData(URIdataInfo) {
    var dataInfo;

    if (URIdataInfo) {
      return URIdataInfo;
    }
    return [blankData()];
  }

  card_data = initAllData(data_from_uri);

  return {
    data: card_data,
    getData: getData,
    updateRules: updateRules,
    addBlankRule: addBlankRule,
    updateExamples: updateExamples,
    addBlankExample: addBlankExample,
    hasException: hasException,
    updateException: updateException,
    gridCount: gridCount,
    setGridName: setGridName,
    addGrid: addGrid,
    getGridName: getGridName,
    updateCardScore: updateCardScore,
    getCardScore: getCardScore,
  }
};


var CardLogic = function (default_rule_count, default_example_count, data_from_uri) {
  var card_data;


  var EXAMPLE_PLACEHOLDER = '[term]',
    REPLACEMENT_REGEX = /\((\w+?)->(\w+?)\)/g;

  function applyRuleToExample(rule, example) {
    var result,
      match,
      replace_this_string_len,
      could_be_a_match;

    if (example === '') {
      return '';
    }

    result = rule.replace(EXAMPLE_PLACEHOLDER, example);

    match = REPLACEMENT_REGEX.exec(result);
    if (match) {
      result = result.replace(REPLACEMENT_REGEX, '');

      // get the string right before it
      replace_this_string_len = match[1].length;

      could_be_a_match = result.substr(match.index - replace_this_string_len, replace_this_string_len);

      if (could_be_a_match === match[1]) {
        result = result.substr(0, match.index - replace_this_string_len)
          + match[2]
          + result.substr(match.index, result.length - 1);
      }
    }

    return result;
  }


  function pairOffData(index) {

    function createMatrixDataForType(type, data) {
      var isException, text;

      if (card_data.hasException(index, data)) {
        isException = true;
        text = card_data.getException(index, data);
      } else {
        isException = false;
        text = applyRuleToExample(data.rule, data.example);
      }

      return {
        type: type,  // todo, data has and needs this, can we drop this one?
        text: text,
        is_exception: isException,
        data: data
      };
    }

    var result = [],
      gridData = card_data.getData(index),
      example_i,
      rule_i,
      newList,
      current_rule,
      current_example,
      source_data,
      target_data;

    for (example_i = 0; example_i < gridData.examples.length; example_i++) {
      newList = [];
      for (rule_i = 0; rule_i < gridData.rules.length; rule_i++) {

        // meh, we could do this earlier, but it's just lookup
        current_rule = gridData.rules[rule_i];
        current_example = gridData.examples[example_i];

        source_data = {
          type: 'source',
          rule: current_rule.source,
          example: current_example.source,
          gridIndex: index
        };

        target_data = {
          type: 'target',
          rule: current_rule.target,
          example: current_example.target,
          gridIndex: index
        };

        newList.push({
          source: createMatrixDataForType('source', source_data),
          target: createMatrixDataForType('target', target_data),
          score: card_data.getCardScore(index, source_data)
        });
      }
      result.push(newList);
    }

    return result;
  }



  function getAllCards() {
    var matrix, flashCards;

    function getFlattenMatrices(entry, i) {
      matrix = pairOffData(i);

      flashCards = matrix.reduce(function (a, b) {
        return a.concat(b);
      });

      return flashCards.filter(checkIfCellIsEmpty);
    }
    // ugh, flatten it one more time
    return card_data.data.map(getFlattenMatrices).reduce(function (a, b) {
      return a.concat(b);
    });
    
  }

  function checkIfCellIsEmpty(cell) {
    return (!(cell.source.text === "" && cell.target.text === ""));
  }

  function clearMatrix(matrix) {
    return matrix.filter(function (d) {
      return (d[0].source.data.example !== "");
    });
  }

  function getCleanMatrix() {
    function getCleanMatrixAndName(entry, i) {
      return {
        data: clearMatrix(cardDataStore.pairOffData(i)),
        name: entry.name
      };
    }

    return card_data.data.map(getCleanMatrixAndName);
  }

  card_data = CardData(default_rule_count, default_example_count, data_from_uri);

  return {
    pairOffData: pairOffData,
    getAllCards: getAllCards,
    getCleanMatrix: getCleanMatrix,
    data: card_data,
  }

};