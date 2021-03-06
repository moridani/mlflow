import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Table from 'react-bootstrap/es/Table';
import ExperimentViewUtil from './ExperimentViewUtil';
import classNames from 'classnames';
import Utils from '../utils/Utils';
import { RunInfo } from '../sdk/MlflowMessages';

/**
 * Table view for displaying runs associated with an experiment. Renders each metric and param
 * value associated with a run in its own column.
 */
class ExperimentRunsTableMultiColumnView extends Component {
  constructor(props) {
    super(props);
    this.getRow = this.getRow.bind(this);
  }

  static propTypes = {
    runInfos: PropTypes.arrayOf(RunInfo).isRequired,
    // List of list of params in all the visible runs
    paramsList: PropTypes.arrayOf(Array).isRequired,
    // List of list of metrics in all the visible runs
    metricsList: PropTypes.arrayOf(Array).isRequired,
    paramKeyList: PropTypes.arrayOf(PropTypes.string),
    metricKeyList: PropTypes.arrayOf(PropTypes.string),
    // List of tags dictionary in all the visible runs.
    tagsList: PropTypes.arrayOf(Object).isRequired,
    // Function which takes one parameter (runId)
    onCheckbox: PropTypes.func.isRequired,
    onCheckAll: PropTypes.func.isRequired,
    onExpand: PropTypes.func.isRequired,
    isAllChecked: PropTypes.bool.isRequired,
    onSortBy: PropTypes.func.isRequired,
    sortState: PropTypes.object.isRequired,
    runsSelected: PropTypes.object.isRequired,
    runsExpanded: PropTypes.object.isRequired,
  };

  getRow({ idx, isParent, hasExpander, expanderOpen, childrenIds }) {
    const {
      runInfos,
      paramsList,
      metricsList,
      paramKeyList,
      metricKeyList,
      onCheckbox,
      sortState,
      runsSelected,
      tagsList,
      onExpand,
    } = this.props;
    const metricRanges = ExperimentViewUtil.computeMetricRanges(metricsList);
    const runInfo = runInfos[idx];
    const paramsMap = ExperimentViewUtil.toParamsMap(paramsList[idx]);
    const metricsMap = ExperimentViewUtil.toMetricsMap(metricsList[idx]);
    const numParams = paramKeyList.length;
    const numMetrics = metricKeyList.length;
    const selected = runsSelected[runInfo.run_uuid] === true;
    const rowContents = [
      ExperimentViewUtil.getCheckboxForRow(selected, () => onCheckbox(runInfo.run_uuid)),
      ExperimentViewUtil.getExpander(
        hasExpander, expanderOpen, () => onExpand(runInfo.run_uuid, childrenIds)),
    ];
    ExperimentViewUtil.getRunInfoCellsForRow(runInfo, tagsList[idx], isParent).forEach((col) =>
      rowContents.push(col));
    paramKeyList.forEach((paramKey, i) => {
      const className = (i === 0 ? "left-border" : "") + " run-table-container";
      const keyName = "param-" + paramKey;
      if (paramsMap[paramKey]) {
        rowContents.push(<td className={className} key={keyName}>
          <div>
            {paramsMap[paramKey].getValue()}
          </div>
        </td>);
      } else {
        rowContents.push(<td className={className} key={keyName}/>);
      }
    });
    if (numParams === 0) {
      rowContents.push(<td className="left-border" key={"meta-param-empty"}/>);
    }
    metricKeyList.forEach((metricKey, i) => {
      const className = (i === 0 ? "left-border" : "") + " run-table-container";
      const keyName = "metric-" + metricKey;
      if (metricsMap[metricKey]) {
        const metric = metricsMap[metricKey].getValue();
        const range = metricRanges[metricKey];
        let fraction = 1.0;
        if (range.max > range.min) {
          fraction = (metric - range.min) / (range.max - range.min);
        }
        const percent = (fraction * 100) + "%";
        rowContents.push(
          <td className={className} key={keyName}>
            {/* We need the extra div because metric-filler-bg is inline-block */}
            <div>
              <div className="metric-filler-bg">
                <div className="metric-filler-fg" style={{width: percent}}/>
                <div className="metric-text">
                  {Utils.formatMetric(metric)}
                </div>
              </div>
            </div>
          </td>
        );
      } else {
        rowContents.push(<td className={className} key={keyName}/>);
      }
    });
    if (numMetrics === 0) {
      rowContents.push(<td className="left-border" key="meta-metric-empty" />);
    }
    const sortValue = ExperimentViewUtil.computeSortValue(
      sortState, metricsMap, paramsMap, runInfo, tagsList[idx]);
    return {
      key: runInfo.run_uuid,
      sortValue: sortValue,
      contents: rowContents,
      isChild: !isParent,
    };
  }

  getMetricParamHeaderCells() {
    const {
      paramKeyList,
      metricKeyList,
      onSortBy,
      sortState
    } = this.props;
    const numParams = paramKeyList.length;
    const numMetrics = metricKeyList.length;
    const columns = [];

    const getHeaderCell = (isParam, key, i) => {
      const isMetric = !isParam;
      const sortIcon = ExperimentViewUtil.getSortIcon(sortState, isMetric, isParam, key);
      const className = classNames("bottom-row", "sortable", { "left-border": i === 0 });
      const elemKey = (isParam ? "param-" : "metric-") + key;
      return (
        <th
          key={elemKey} className={className}
          onClick={() => onSortBy(isMetric, isParam, key)}
        >
          <span
            style={styles.metricParamNameContainer}
            className="run-table-container"
          >
            {key}
          </span>
          <span style={styles.sortIconContainer}>{sortIcon}</span>
        </th>);
    };

    paramKeyList.forEach((paramKey, i) => {
      columns.push(getHeaderCell(true, paramKey, i));
    });
    if (numParams === 0) {
      columns.push(<th key="meta-param-empty" className="bottom-row left-border">(n/a)</th>);
    }

    metricKeyList.forEach((metricKey, i) => {
      columns.push(getHeaderCell(false, metricKey, i));
    });
    if (numMetrics === 0) {
      columns.push(<th key="meta-metric-empty" className="bottom-row left-border">(n/a)</th>);
    }
    return columns;
  }

  render() {
    const {
      runInfos,
      onCheckAll,
      isAllChecked,
      onSortBy,
      sortState,
      tagsList,
      runsExpanded,
      paramKeyList,
      metricKeyList,
    } = this.props;
    const rows = ExperimentViewUtil.getRows({
      runInfos,
      sortState,
      tagsList,
      runsExpanded,
      getRow: this.getRow
    });
    const columns = [
      ExperimentViewUtil.getSelectAllCheckbox(onCheckAll, isAllChecked),
      ExperimentViewUtil.getExpanderHeader(),
    ];
    ExperimentViewUtil.getRunMetadataHeaderCells(onSortBy, sortState)
      .forEach((cell) => columns.push(cell));
    this.getMetricParamHeaderCells().forEach((cell) => columns.push(cell));
    return (<Table className="ExperimentViewMultiColumn" hover>
      <colgroup span="8"/>
      <colgroup span={paramKeyList.length}/>
      <colgroup span={metricKeyList.length}/>
      <tbody>
      <tr>
        <th className="top-row" scope="colgroup" colSpan="6"/>
        <th
          className="top-row left-border"
          scope="colgroup"
          colSpan={paramKeyList.length}
        >
          Parameters
        </th>
        <th className="top-row left-border" scope="colgroup"
          colSpan={metricKeyList.length}>Metrics
        </th>
      </tr>
      <tr>
        {columns}
      </tr>
      {ExperimentViewUtil.renderRows(rows)}
      </tbody>
    </Table>);
  }
}

const styles = {
  sortIconContainer: {
    marginLeft: 2,
    minWidth: 12.5,
    display: 'inline-block',
  },
  metricParamNameContainer: {
    verticalAlign: "middle",
    display: "inline-block",
  },
};

export default ExperimentRunsTableMultiColumnView;
