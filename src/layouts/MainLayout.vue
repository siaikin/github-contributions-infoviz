<template>
  <q-layout view="hHh Lpr lFf">
    <q-header elevated>
      <q-toolbar>
        <!--        <q-btn-->
        <!--          flat-->
        <!--          dense-->
        <!--          round-->
        <!--          icon="menu"-->
        <!--          aria-label="Menu"-->
        <!--          @click="toggleLeftDrawer"-->
        <!--        />-->

        <q-toolbar-title> Contributions Infoviz </q-toolbar-title>
        <q-space />
        <q-btn
          flat
          round
          dense
          icon="mdi-github"
          href="https://github.com/siaikin/github-contributions-infoviz"
          target="_blank"
        >
        </q-btn>
      </q-toolbar>
    </q-header>

    <!--    <q-drawer v-model="leftDrawerOpen" bordered> </q-drawer>-->

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const leftDrawerOpen = ref(false);

function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value;
}
</script>
