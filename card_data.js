var card_data = function (default_rule_count, default_example_count, data_from_uri) {
  var card_data,
    data;

  function hashRuleExample(rule) {
    return JSON.stringify(rule);
  }

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
      dataInfo.rules.push({
        target: '[term]',
        source: '[term]'
      });
    }

    for (example_i = 0; example_i < default_example_count; example_i++) {
      dataInfo.examples.push({
        target: '',
        source: ''
      });
    }
    return dataInfo;
  }


  function initAllData(URIdataInfo) {
    var dataInfo,
      rule_i,
      example_i;

    if (URIdataInfo) {
      return URIdataInfo;
    }
    return [blankData()];
  }


  function updateException(gridIndex, data, new_exception) {
    data[gridIndex].exceptions[hashRuleExample(d.data)] = new_exception;
  }

  function updateDataFromRulesExamples(gridIndex, source_rules, target_rules, source_examples, target_examples) {
    var blank,
      rule_i,
      example_i;

    blank = {
      name: data[gridIndex].name,
      rules: [],
      examples: [],
      exceptions: data[gridIndex].exceptions,
      cardScores: data[gridIndex].cardScores
    };

    for (rule_i = 0; rule_i < source_rules.length; rule_i++) {
      blank.rules.push({
        source: source_rules[rule_i],
        target: target_rules[rule_i]
      });
    }

    for (example_i = 0; example_i < source_examples.length; example_i++) {
      blank.examples.push({
        source: source_examples[example_i],
        target: target_examples[example_i]
      });
    }

    data[gridIndex] = blank;
    return data;
  }

  function pairOffData(index) {
    var gridData = data[index];

    function createMatrixDataForType(type, data) {
      var isException, text;

      if (gridData.exceptions.hasOwnProperty(hashRuleExample(data))) {
        isException = true;
        text = gridData.exceptions[hashRuleExample(data)];
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
          score: gridData.cardScores[hashRuleExample(source_data)]
        });
      }
      result.push(newList);
    }

    return result;
  }

  function addBlankExample(index) {
    data[index].examples.push({
      target: '',
      source: ''
    });
  }

  function addBlankRule(index) {
    data[index].rules.push({
      target: '[term]',
      source: '[term]'
    });
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
    return data.map(getFlattenMatrices).reduce(function (a, b) {
      return a.concat(b);
    });
    
  }

  function checkIfCellIsEmpty(cell) {
    return (!(cell.source.text === "" && cell.target.text === ""));
  }

  function addGrid() {
    data.push(blankData());
  }

  function setGridName(index, name) {
    data[index].name = name;
  }

  function updateCardScore(cardData, score) {
    // TODO: this is complicated, rework
    if (!data[cardData.gridIndex].cardScores.hasOwnProperty(hashRuleExample(cardData))) {
      data[cardData.gridIndex].cardScores[hashRuleExample(cardData)] = [];
    }

    data[cardData.gridIndex].cardScores[hashRuleExample(cardData)].push(score);
  }

  function gridCount() {
    return data.length;
  }

  function getData() {
    return data;
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

    return data.map(getCleanMatrixAndName);
  }

  data = initAllData(data_from_uri)

  return {
    updateDataFromRulesExamples: updateDataFromRulesExamples,
    getData: getData,
    addBlankExample: addBlankExample,
    addBlankRule: addBlankRule,
    gridCount: gridCount,
    pairOffData: pairOffData,
    setGridName: setGridName,
    addGrid: addGrid,
    getAllCards: getAllCards,
    updateCardScore: updateCardScore,
    getCleanMatrix: getCleanMatrix,
  }

};