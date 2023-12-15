<script setup lang="ts">
import Playground from "./views/contributes-playground.vue";
</script>

<template>
  <v-layout :full-height="true" style="width: 100%">
    <Suspense>
      <Playground />
    </Suspense>
  </v-layout>
</template>

<style scoped></style>
