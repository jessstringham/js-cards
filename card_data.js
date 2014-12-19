var CardData = function (default_rule_count, default_example_count, data_from_uri) {
  /* We store the data in this format:
     [ CardGrid ]
    
     CardGrid
     {
       name: string
       rules: [Rules]
       examples: [Examples]
       exceptions: {hashedRuleExampleType: string}
       cardScores: {hashedRuleExample: [int]}
     }
    
     Rule 
     {
       target: string
       source: string
     }

     Example
     {
       target: string
       source: string
     }
  */
  var card_data;

  var EXAMPLE_PLACEHOLDER = '[term]',
      REPLACEMENT_REGEX = /\((\w+?)->(\w+?)\)/g;

  function applyRuleToExample(rule, example) {
    if (example === '') {
      return '';
    }

    var result = rule.replace(EXAMPLE_PLACEHOLDER, example),
        match,
        replace_this_string_len,
        could_be_a_match;

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

  function hashRuleExample(dataBit) {
    return JSON.stringify(rule);
  }

  function hashRuleAndExample(rule, example) {
    return JSON.stringify([rule, example]);
  }

  function hashTypeRuleExample(type, rule, example) {
    return JSON.stringify([type, rule, example]);
  }

  function makeSourceTarget(source_target_list) {
    return {
      source: source_target_list[0],
      target: source_target_list[1]
    };
  }

  function sourceTargetObjListFromList(source_list, target_list) {
    return d3.zip(source_list, target_list).map(makeSourceTarget);
  }

  // examples
  function addBlankExampleToCardGrid(cardGrid) {
    cardGrid.examples.push(makeSourceTarget(['', '']));
  }

  //rules
  function addBlankRuleToCardGrid(cardGrid) {
    cardGrid.rules.push(makeSourceTarget([EXAMPLE_PLACEHOLDER, EXAMPLE_PLACEHOLDER]));
  }


  // grids
  function addGrid() {
    card_data.push(blankData());
  }

  function setGridName(index) {
    return function (name) {
      card_data[index].name = name;
    }
  }

  function getGridName(index) {
    return card_data[index].name;
  }

  function hashCardScore(rule, example) {
    return hashRuleAndExample(rule, example)
  }

  // scores
  function getCardScore(index, rule, example) {
    return card_data[index].cardScores[hashCardScore(rule, example)] || [];
  }

  function updateCardScore(data, score) {
    var hashedCardScore = hashCardScore(data.target.rule, data.target.example);
    var cardScore = getCardScore(data.index, data.target.rule, data.target.example);

    cardScore.push(score);

    card_data[data.index].cardScores[hashedCardScore] = cardScore;
  }

  // exceptions
  function updateException(gridIndex, type, rule, example, new_exception) {
    card_data[gridIndex].exceptions[hashTypeRuleExample(type, rule, example)] = new_exception;
  }

  function getException(gridIndex, type, rule, example) {
    return card_data[gridIndex].exceptions[hashTypeRuleExample(type, rule, example)];
  }

  function hasException(gridIndex, type, rule, example) {
    return card_data[gridIndex].exceptions.hasOwnProperty(hashTypeRuleExample(type, rule, example));
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

  function dump() {
    return card_data;
  }

  function initAllData(URIdataInfo) {
    var dataInfo;

    if (URIdataInfo) {
      return URIdataInfo;
    }
    return [blankData()];
  }

  function make_matrix_cell(index, type, rule_obj, example_obj) {
    var current_rule = rule_obj[type],
        current_example = example_obj[type];

    if (hasException(index, type, current_rule, current_example)) {
      isException = true;
      text = getException(index, type, current_rule, current_example);
    } else {
      isException = false;
      text = applyRuleToExample(current_rule, current_example);
    }

    return {
      text: text,
      type: type,
      rule: current_rule,
      example: current_example,
      is_exception: isException,
    };
  }


  card_data = initAllData(data_from_uri);


  

  function cardsView() {
    function checkIfCellIsEmpty(cell) {
      return (!(cell.source.text === "" || cell.target.text === ""));
    }

    return d3.merge(card_data.map(function (d, i) {
      return d3.merge(grid(i).view().gridMatrix);
    })).filter(checkIfCellIsEmpty);
  }

  function matricesView() {
    return card_data.map(function (d, i) {
      return {
        name: d.name,
        data: grid(i).view().gridMatrix
      }
    })
  }


  grids = {
    first: function () {return grid(0)},
    last: function () {return grid(card_data.length - 1)},
    add: addGrid,
  }

  study = {
    view: function () {
      return {
        cards: cardsView(),
        matrices: matricesView(),
      }
    },
    content: {
      updateScore: updateCardScore
    }
  }

  function grid(index) {

    var gridName = {
      set: setGridName(index),
      get: getGridName(index)
    }

    var gridInfo = {
      is_first: index === 0,
      is_last: index === card_data.length - 1
    }

    var content = {
      addBlankRule: function () {
        addBlankRuleToCardGrid(card_data[index]);
      },
      addBlankExample: function () {
        addBlankExampleToCardGrid(card_data[index]);
      },
      updateRules: function (source_rules, target_rules) {
        card_data[index].rules = sourceTargetObjListFromList(source_rules, target_rules);
      },
      updateExamples: function (source_examples, target_examples) {
        card_data[index].examples = sourceTargetObjListFromList(source_examples, target_examples);
      },
    }

    function view() {
      return {
        examples: card_data[index].examples,
        rules: card_data[index].rules,
        gridMatrix: card_data[index].examples.map(function (example) {
          return card_data[index].rules.map(function (rule) {
            return {
              index: index,
              score: getCardScore(index, rule.target, example.target),
              source: make_matrix_cell(index, 'source', rule, example),
              target: make_matrix_cell(index, 'target', rule, example)
            };
          });
        }),
      }
    }

    var navigate = {
      next: function () { return grid(index + 1) },
      previous: function () { return grid(index - 1)}
    }

    return {
      name: gridName,
      info: gridInfo,
      view: view,
      content: content,
      navigate: navigate,
    }
  }


  return {
    dump: dump,
    grids: grids,
    study: study
  }
};
