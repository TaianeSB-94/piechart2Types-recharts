import React from 'react';
import * as d3 from 'd3';

import { scaleOrdinal } from 'd3-scale';
import { schemeCategory10 } from 'd3-scale-chromatic';

import { css, cx } from 'emotion';

import {
  PieChart, Pie, Sector, Cell, Tooltip, Legend,
} from 'recharts';

import {
  PanelProps,
  FieldType,
  getNamedColorPalette,
  getColorForTheme,
  DisplayValue,
  MappingType,
  ValueMap,
  RangeMap,
  ValueMapping,
  Field,
  ArrayVector,
} from '@grafana/data';
import { useTheme, Badge, Icon } from '@grafana/ui';

import { TreemapOptions } from 'types';

// Tippy
import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css';
import { followCursor } from 'tippy.js';
import { color } from 'd3';

const docsUrl = 'https://grafana.com/grafana/plugins/marcusolsson-treemap-panel';

// Selecting the same field for text and color creates duplicate nodes. This
// prefix is used to make the strings used for color unique. The prefix is only
// used for generating the tree, and is trimmed before presentation.
const colorNodePrefix = '$color_';

const originNodeId = 'Origin';
const ungroupedNodeId = 'Ungrouped';

interface Props extends PanelProps<TreemapOptions> { }

export const TreemapPanel: React.FC<Props> = ({ options, data, width, height }) => {
  const theme = useTheme();

  const frame = data.series[0];
  // console.log(frame);

  const textField = frame.fields.find(field =>
    options.textField ? field.name === options.textField : field.type === FieldType.string
  );
  // console.log(textField);

  const sizeField = frame.fields.find(field =>
    options.sizeField ? field.name === options.sizeField : field.type === FieldType.number
  );
  // console.log(sizeField);

  const colorField = frame.fields.find(field =>
    options.colorField ? field.name === options.colorField : field.type === FieldType.number
  );
  // console.log(colorField);

  const success = css`
    color: ${theme.palette.brandSuccess};
  `;

  if (!textField || !sizeField) {
    return (
      <div style={{ overflow: 'hidden', height: '100%' }}>
        <p>To get started, create a query that returns:</p>
        <p>
          <div>
            <span className={cx({ [success]: !!textField })}>
              <Icon name={textField ? 'check-circle' : 'circle'} />
            </span>
            <span style={{ marginLeft: 5 }}>A text field</span>
          </div>
          <div>
            <span className={cx({ [success]: !!sizeField })}>
              <Icon name={sizeField ? 'check-circle' : 'circle'} />
            </span>
            <span style={{ marginLeft: 5 }}>A number field</span>
          </div>
        </p>
        <a href={docsUrl} style={{ color: theme.colors.linkExternal }}>
          Read the documentation
        </a>
      </div>
    );
  }

  if (frame.length === 0) {
    return <p>Query returned an empty result.</p>;
  }

  const isGrouped = colorField?.type !== FieldType.number;

  const palette = getThemePalette(theme);

  // Use the provided display formatter, or fall back to a default one.
  const formatValue = sizeField?.display
    ? sizeField.display
    : (value: number): DisplayValue => ({ numeric: value, text: value.toString() });

  // Apply value mappings.
  const mappedTextField = withMappedValues(textField, textField?.config.mappings ?? []);
  const mappedSizeField = withMappedValues(sizeField, sizeField?.config.mappings ?? []);
  const mappedColorField = withMappedValues(colorField, colorField?.config.mappings ?? []);

  // console.log(mappedTextField);
  // console.log(mappedSizeField);
  console.log(mappedColorField);

  // Convert fields into rows.
  const rows = Array.from({ length: frame.length }).map((v, i) => ({
    text: mappedTextField?.values.get(i),
    size: mappedSizeField?.values.get(i),
    color: mappedColorField?.values.get(i),
  }));

  const allCategories = [
    {
      name: originNodeId,
      parent: '',
    },
  ].concat(
    [...new Set(rows.map(row => row.color).concat([ungroupedNodeId]))].map(c => ({
      name: colorNodePrefix + c,
      parent: originNodeId,
    }))
  );

  // Convert rows to links for the stratify function.
  const links = rows.map((link, i) => ({
    name: link.text,
    value: link.size,
    parent: isGrouped ? colorNodePrefix + link.color || ungroupedNodeId : originNodeId,
    category: link.color,
  }));

  const root = d3
    .stratify()
    .id((d: any) => d.name)
    .parentId((d: any) => d.parent)([...allCategories, ...links]);

  // Sum and sort values.
  root
    .sum((d: any) => {
      return d.value;
    })
    .sort((a: any, b: any) => b.value - a.value);

  const margin = { top: 20, left: 10, bottom: 10, right: 10 };

  let treemap = d3
    .treemap()
    .tile(d3[options.tiling])
    .size([width, height])
    .round(true)
    .padding(4);

  treemap(root);

  // Create a scale for mapping categories to a color.
  const colorScale = d3
    .scaleOrdinal<string>()
    .domain(allCategories.map(c => c.name))
    .range(getThemePalette(theme));

  const colorScale2 = d3
    .scaleLinear<string>()
    .domain([sizeField?.config.min ?? 0, sizeField?.config.max ?? 0])
    .range([theme.palette.white, palette[0]]);

  let cor = [] as any;
  for (let index = 0; index < sizeField.values.length; index++) {
    cor.push("#" + Math.floor(Math.random() * 16777215).toString(16));
  }
  console.log(cor)

  const teste = Array.from({ length: frame.length }).map((v, i) => ({
    name: mappedTextField?.values.get(i),
    value: mappedSizeField?.values.get(i)
  }));

  return (
    <div>

      <PieChart width={width} height={height}>
        <Pie dataKey="value" startAngle={180} endAngle={0} innerRadius={options.pieOptions} outerRadius={options.pieOptions} data={teste} cx={width / 2} cy={height / 2} outerRadius={80} fill={cor[0]} label />
        <Tooltip />
        <Legend />
      </PieChart>
    </div>
  );
};

const getThemePalette = (theme: any): string[] => {
  const colors: string[] = [];
  for (let entry of getNamedColorPalette()) {
    colors.push(getColorForTheme(entry[1][0], theme.type));
  }
  return colors;
};

const measureText = (text: string): number => {
  var canvas = document.createElement('canvas');
  var ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.font = '14px Arial';
    return ctx.measureText(text).width;
  }
  return 0;
};

const withMappedValues = (field: Field | undefined, mappings: ValueMapping[]): Field | undefined => {
  if (field) {
    const copy = field?.values.toArray();
    const values = copy?.map(val => mapFieldValue(val, mappings));
    field.values = new ArrayVector(values);
  }
  return field;
};

const mapFieldValue = (value: string | number, mappings: ValueMapping[]): any => {
  let res;
  if (mappings.length === 0) {
    return value;
  }
  for (let mapping of mappings) {
    if (typeof value === 'number') {
      if (mapping.type === MappingType.ValueToText) {
        const valueMap = mapping as ValueMap;
        res = value.toString() === valueMap.value ? +valueMap.text : value;
      } else if (mapping.type == MappingType.RangeToText) {
        const rangeMap = mapping as RangeMap;
        const inRange = +rangeMap.from <= value && value < +rangeMap.to;
        res = inRange ? rangeMap.to : value;
      }
    } else if (typeof value === 'string') {
      if (mapping.type === MappingType.ValueToText) {
        const valueMap = mapping as ValueMap;
        res = value.toString() === valueMap.value ? valueMap.text : value;
      } else if (mapping.type === MappingType.RangeToText) {
        // Can't map a string to a numeric range.
        res = value;
      }
    }
  }
  return res;
};
