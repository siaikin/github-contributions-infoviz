import { select } from 'd3-selection';
import { RepositoryCommit } from 'components/search-panel/use-git-commit';
import { CommitSearchParams } from 'components/search-panel/models';
import { interval } from 'd3-timer';
import { utcDay, utcDays } from 'd3-time';
import { InternMap, max, range, sort, descending } from 'd3-array';
import { isNil } from 'lodash-es';
import { scaleBand, scaleLinear, scaleOrdinal } from 'd3-scale';
import { schemeAccent } from 'd3-scale-chromatic';
import { stack } from 'd3-shape';
import { axisTop } from 'd3-axis';
import { transition } from 'd3-transition';
import { easeLinear } from 'd3-ease';
import { format } from 'd3-format';
import { interpolateRound } from 'd3-interpolate';
import { DefaultDateFormatter } from 'components/charts/intl-utils';
import { SeriesPoint } from 'd3';

export interface Margin {
  marginTop: number;
  marginRight: number;
  marginBottom: number;
  marginLeft: number;
}

export class Renderer {
  constructor(
    public readonly container: SVGElement,
    public readonly margin: Margin
  ) {}

  private ticker: ReturnType<typeof interval> | null = null;
  private contributorMap: Map<string, { avatarUrl: string }> = new Map();
  private dataSource: Array<[string, ...Array<number>]> = [];
  private authorNameMaxWidth = 0;
  private commitCountMaxWidth = 0;
  private colourScale = scaleOrdinal([] as Array<string>, schemeAccent);

  /**
   * 当前渲染时间点在 @{link timeline} 中的索引. 范围在 [0, timeline.length - 1].
   * @private
   */
  private innerCurrentTime = 0;
  get currentTime() {
    return this.innerCurrentTime;
  }
  set currentTime(value: number) {
    if (value <= 0) value = 0;
    else if (value >= this.timeline.length) value = this.timeline.length - 1;

    this.innerCurrentTime = value;
    this.renderFrame();
  }
  timeline: Array<Date> = [];
  playing = false;

  private baseAnimationDuration = 250;
  animationRate = 1;
  get animationDuration() {
    return this.baseAnimationDuration / this.animationRate;
  }

  initEnv() {
    this.container.innerHTML = '';

    const defs = select(this.container).append('defs');
    defs
      .append('clipPath')
      .attr('id', 'author-avatar-clip-path')
      .attr('clipPathUnits', 'objectBoundingBox')
      .append('circle')
      .attr('cx', 0.5)
      .attr('cy', 0.5)
      .attr('r', 0.4);
    defs
      .append('clipPath')
      .attr('id', 'author-avatar-background')
      .attr('clipPathUnits', 'objectBoundingBox')
      .append('circle')
      .attr('cx', 0.5)
      .attr('cy', 0.5)
      .attr('r', 0.5);
  }

  data(
    commitGroups: Array<[string, Array<RepositoryCommit>]>,
    contributors: CommitSearchParams['contributors'],
    start: Date,
    end: Date
  ) {
    this.initEnv();
    this.reset(false);

    const startDay = utcDay(start);
    const endDay = utcDay.offset(end, 1);

    // |              | day1 | day2 | day3 | ... | dayN |
    // | contributor1 |   1  |   2  |   3  | ... |   N  |
    // | contributor2 |   1  |   2  |   3  | ... |   N  |
    // | contributor3 |   1  |   2  |   3  | ... |   N  |
    // | ...          |  ... |  ... |  ... | ... |  ... |
    // | contributorN |   1  |   2  |   3  | ... |   N  |

    // 以天为间隔的时间点
    const days = utcDays(startDay, endDay, 1);
    const dayMapToIndex = new InternMap<number, number>(
      days.map((d, i) => [d.getTime(), i])
    );
    const commitGroupByContributor: Array<[string, ...Array<number>]> = [];
    for (const [key, commits] of commitGroups) {
      const row = Array.from({ length: days.length + 1 }, () => 0) as [
        string,
        ...Array<number>
      ];
      row[0] = key;

      for (const commit of commits) {
        const index = dayMapToIndex.get(
          utcDay(new Date(commit.committer.date)).getTime()
        );
        if (isNil(index)) {
          console.warn('Invalid date', commit.committer.date);
          continue;
        }

        (row[index + 1] as number) += 1;
      }
      for (let i = 2; i < row.length; i++) {
        (row[i] as number) += row[i - 1] as number;
      }

      commitGroupByContributor.push(row);
    }
    this.dataSource = commitGroupByContributor;
    this.timeline = days;

    this.contributorMap = new Map<string, { avatarUrl: string }>(
      (contributors ?? []).map((c) => [
        c.login as string,
        { avatarUrl: c.avatar_url as string },
      ])
    );

    this.colourScale = scaleOrdinal(
      commitGroupByContributor.map((row) => row[0]),
      schemeAccent
    );

    this.initialAnimation();
  }

  play() {
    this.playing = true;

    // render first frame
    this.currentTime++;

    this.ticker?.stop();
    this.ticker = interval(() => {
      this.currentTime++;
      if (this.currentTime >= this.timeline.length - 1) {
        this.ticker?.stop();
        this.playing = false;
      }
    }, this.animationDuration);
  }

  pause() {
    this.ticker?.stop();
    this.playing = false;
  }

  resume() {
    this.play();
  }

  /**
   * @param firstFrame 是否重置并渲染到第一帧
   */
  reset(firstFrame = true) {
    this.playing = false;
    this.ticker?.stop();

    // 设置 currentTime 会触发 renderFrame
    if (firstFrame) {
      this.currentTime = 0;
    } else {
      this.innerCurrentTime = 0;
    }
  }

  playbackRate(d: number) {
    this.animationRate = d;

    if (this.playing) {
      this.pause();
      this.resume();
    }
  }

  private get width(): number {
    const [, , width] = this.container
      .getAttribute('viewBox')
      ?.split(' ')
      .map((item) => Number.parseFloat(item)) ?? [0, 0, 0, 0];
    return width;
  }

  private get boundWidth(): number {
    return (
      this.width -
      this.margin.marginLeft -
      this.margin.marginRight -
      this.authorNameMaxWidth -
      this.commitCountMaxWidth
    );
  }

  private get height(): number {
    const [, , , height] = this.container
      .getAttribute('viewBox')
      ?.split(' ')
      .map((item) => Number.parseFloat(item)) ?? [0, 0, 0, 0];
    return height;
  }

  private get boundHeight(): number {
    const [, , , height] = this.container
      .getAttribute('viewBox')
      ?.split(' ')
      .map((item) => Number.parseFloat(item)) ?? [0, 0, 0, 0];
    return height - this.margin.marginTop - this.margin.marginBottom;
  }

  private get currentCommitGroupByDay() {
    return sort(
      this.dataSource.map(
        (row) => [row[0], row[this.currentTime + 1]] as [string, number]
      ),
      (a, b) => descending(a[1], b[1])
    );
  }

  private initialAnimation() {
    const commitGroupByDay = this.currentCommitGroupByDay;
    const date = this.timeline[0];

    const groupKeys = range(Math.max(16, commitGroupByDay.length)).map(
      (_, index) => commitGroupByDay[index]?.[0] ?? index.toString()
    );

    const contributorScale = scaleBand(groupKeys, [
      0,
      this.boundHeight,
    ]).padding(0.1);
    const commitCountScale = scaleLinear(
      [0, max(commitGroupByDay, (d) => d[1]) || 10],
      [0, this.boundWidth]
    );

    const series = stack<[string, number]>()
      .keys(['commitCount'])
      .value((d) => d[1])(commitGroupByDay);

    const svg = select(this.container);

    const xAxis = axisTop(commitCountScale)
      .ticks(5)
      .tickSize(-this.boundHeight);
    svg
      .append('g')
      .classed('axis', true)
      .classed('x-axis', true)
      .attr(
        'transform',
        `translate(${this.margin.marginLeft + this.authorNameMaxWidth}, ${
          this.margin.marginTop
        })`
      )
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      .call(xAxis);

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const rendererThis = this;
    svg
      .append('g')
      .classed('rects', true)
      .attr(
        'transform',
        `translate(${this.margin.marginLeft + this.authorNameMaxWidth}, ${
          this.margin.marginTop
        })`
      )
      .data(series)
      .selectAll('g.bar')
      .data(
        (d) => d,
        function (datum, index, groups) {
          return (datum as SeriesPoint<[string, number]>).data[0];
        }
      )
      .enter()
      .append('g')
      .classed('bar', true)
      .attr('transform', (d) => `translate(0, ${contributorScale(d.data[0])})`)
      .each(function (datum, index, groups) {
        select(this)
          .append('rect')
          .attr('fill', rendererThis.colourScale(datum.data[0]))
          .attr('height', contributorScale.bandwidth())
          .attr('width', commitCountScale(datum.data[1]));
        select(this)
          .append('text')
          .classed('author-name', true)
          .attr(
            'x',
            commitCountScale(datum.data[1]) - contributorScale.bandwidth() / 2
          )
          .attr('y', () => contributorScale.bandwidth() / 2)
          .append('tspan')
          .attr('font-size', `${contributorScale.bandwidth() * 0.5}px`)
          .attr('font-weight', 'bold')
          .attr('fill', 'darkslategray')
          .attr('text-anchor', 'end')
          .attr('alignment-baseline', 'central')
          .text(datum.data[0]);
        select(this)
          .append('text')
          .classed('commit-count', true)
          .attr(
            'x',
            commitCountScale(datum.data[1]) -
              contributorScale.bandwidth() / 2 +
              5
          )
          .attr('y', () => contributorScale.bandwidth() / 2)
          .append('tspan')
          .attr('font-size', `${contributorScale.bandwidth() / 2}px`)
          .attr('font-weight', 'bold')
          .attr('fill', 'darkslategray')
          .attr('text-anchor', 'start')
          .attr('alignment-baseline', 'central')
          .text(format(',.0f')(datum.data[1]));
        select(this)
          .append('circle')
          .classed('author-avatar-background', true)
          .attr('fill', rendererThis.colourScale(datum.data[0]))
          .attr('cx', commitCountScale(datum.data[1]))
          .attr('cy', contributorScale.bandwidth() / 2)
          .attr('r', contributorScale.bandwidth() / 2);
        select(this)
          .append('image')
          .attr('clip-path', 'url(#author-avatar-clip-path)')
          .attr('stroke', 'url(#author-avatar-background)')
          .attr(
            'xlink:href',
            rendererThis.contributorMap.get(datum.data[0])?.avatarUrl ?? ''
          )
          .attr(
            'x',
            commitCountScale(datum.data[1]) - contributorScale.bandwidth() / 2
          )
          .attr('y', 0)
          .attr('width', contributorScale.bandwidth())
          .attr('height', contributorScale.bandwidth());
      });

    svg
      .selectAll('text.date-text')
      .data([date], (_, index) => index)
      .enter()
      .append('text')
      .classed('date-text', true)
      .attr('x', this.width - 10)
      .attr('y', this.height - 10)
      .append('tspan')
      .attr('text-anchor', 'end')
      .attr('alignment-baseline', 'central')
      .attr('fill', 'gray')
      .attr('font-weight', 'bold')
      .text((d) => DefaultDateFormatter.format(d));

    this.authorNameMaxWidth = this.getLabelMaxWidth('g.bar text.author-name');
    this.commitCountMaxWidth = this.getLabelMaxWidth('g.bar text.commit-count');
    svg
      .select('g.x-axis')
      .attr(
        'transform',
        `translate(${this.margin.marginLeft + this.authorNameMaxWidth}, ${
          this.margin.marginTop
        })`
      );
    svg
      .select('g.rects')
      .attr(
        'transform',
        `translate(${this.margin.marginLeft + this.authorNameMaxWidth}, ${
          this.margin.marginTop
        })`
      );
  }

  private renderFrame() {
    const commitGroupByDay = this.currentCommitGroupByDay;
    const date = this.timeline[this.currentTime];

    const groupKeys = range(Math.max(16, commitGroupByDay.length)).map(
      (_, index) => commitGroupByDay[index]?.[0] ?? index.toString()
    );

    const contributorScale = scaleBand(groupKeys, [
      0,
      this.boundHeight,
    ]).padding(0.1);
    const commitCountScale = scaleLinear(
      [0, max(commitGroupByDay, (d) => d[1]) || 10],
      [0, this.boundWidth]
    );

    const series = stack<[string, number]>()
      .keys(['commitCount'])
      .value((d) => d[1])(commitGroupByDay);

    const svg = select(this.container);

    const t = transition().duration(this.animationDuration).ease(easeLinear);

    const xAxis = axisTop(commitCountScale)
      .ticks(5)
      .tickSize(-this.boundHeight);
    svg
      .select('g.x-axis')
      .transition(t)
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      .call(xAxis);

    svg
      .data(series)
      .selectAll('g.bar')
      .data(
        (d) => d,
        function (datum, index, groups) {
          return (datum as SeriesPoint<[string, number]>).data[0];
        }
      )
      .transition(t)
      .attr('transform', (d) => `translate(0, ${contributorScale(d.data[0])})`)
      .each(function (datum, index, groups) {
        select(this)
          .select('rect')
          .transition(t)
          .attr('height', contributorScale.bandwidth())
          .attr('width', commitCountScale(datum.data[1]));
        select(this)
          .select('text.author-name')
          .transition(t)
          .attr(
            'x',
            commitCountScale(datum.data[1]) - contributorScale.bandwidth() / 2
          )
          .attr('y', () => contributorScale.bandwidth() / 2)
          .select('tspan')
          .attr('font-size', `${contributorScale.bandwidth() * 0.5}px`);
        select(this)
          .select('text.commit-count')
          .transition(t)
          .attr(
            'x',
            commitCountScale(datum.data[1]) +
              contributorScale.bandwidth() / 2 +
              5
          )
          .attr('y', () => contributorScale.bandwidth() / 2)
          .select('tspan')
          .attr('font-size', `${contributorScale.bandwidth() * 0.5}px`)
          .tween('text', function () {
            const that = this as SVGTextElement;
            const i = interpolateRound(
              Number.parseFloat(that.textContent ?? ''),
              datum.data[1]
            );
            return (t) => (that.textContent = format(',.0f')(i(t)));
          });
        select(this)
          .select('image')
          .transition(t)
          .attr(
            'x',
            commitCountScale(datum.data[1]) - contributorScale.bandwidth() / 2
          )
          .attr('width', contributorScale.bandwidth())
          .attr('height', contributorScale.bandwidth());
        select(this)
          .select('circle.author-avatar-background')
          .transition(t)
          .attr('cx', commitCountScale(datum.data[1]))
          .attr('cy', contributorScale.bandwidth() / 2)
          .attr('r', contributorScale.bandwidth() / 2);
      });

    svg
      .select('text.date-text')
      .attr('x', this.width - 10)
      .attr('y', this.height - 10)
      .select('tspan')
      .text(DefaultDateFormatter.format(date));
    this.commitCountMaxWidth = this.getLabelMaxWidth('g.bar text.commit-count');
  }

  private getLabelMaxWidth(selector: string) {
    const widthList: Array<number> = [];

    select(this.container)
      .selectAll(selector)
      .each(function () {
        widthList.push((this as SVGSVGElement).getBBox().width);
      });

    return max(widthList) ?? 0;
  }
}
