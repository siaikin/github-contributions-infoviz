<template>
  <q-page class="row items-center justify-evenly">
    <div class="fit row wrap justify-start items-start content-start">
      <div style="overflow: auto; min-width: 480px; max-width: 480px">
        <SearchForm />
      </div>
      <div class="col-grow" style="overflow: hidden">2</div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { initialOctokit } from '../http-interfaces';
import { timeFormatDefaultLocale } from 'd3-time-format';
import SearchForm from 'components/search-form/SearchForm.vue';

timeFormatDefaultLocale({
  dateTime: '%x %A %X',
  date: '%Y年%-m月%-d日',
  time: '%H:%M:%S',
  periods: ['上午', '下午'],
  days: ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'],
  shortDays: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'],
  months: [
    '一月',
    '二月',
    '三月',
    '四月',
    '五月',
    '六月',
    '七月',
    '八月',
    '九月',
    '十月',
    '十一月',
    '十二月',
  ],
  shortMonths: [
    '一月',
    '二月',
    '三月',
    '四月',
    '五月',
    '六月',
    '七月',
    '八月',
    '九月',
    '十月',
    '十一月',
    '十二月',
  ],
});
initialOctokit('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');
</script>
