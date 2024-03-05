<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <q-card style="width: 700px; max-width: 80vw">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">Login with GitHub</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>
      <q-card-section>
        <p>
          Contributions Infoviz use GitHub API to fetch contributions data. You
          may see this page because you have hit the
          <a
            href="https://docs.github.com/en/rest/overview/resources-in-the-rest-api"
            >GitHub API rate limit</a
          >
          .
        </p>
        <p>
          To continue using this app, you need to
          <q-btn
            push
            icon="mdi-github"
            color="primary"
            label="Login with GitHub"
            @click="handleGitHubOAuth"
          />
          .
        </p>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { useDialogPluginComponent, useQuasar } from 'quasar';
import { initialOctokit } from 'src/http-interfaces';
import { useOAuthStore } from 'stores/oauth-store';
import { isNil } from 'lodash-es';

const $q = useQuasar();
const oauthStore = useOAuthStore();

defineEmits([
  // REQUIRED; need to specify some events that your
  // component will emit through useDialogPluginComponent()
  ...useDialogPluginComponent.emits,
]);

const {
  dialogRef,
  onDialogHide,
  onDialogOK,
  // onDialogCancel
} = useDialogPluginComponent();
// dialogRef      - Vue ref to be applied to QDialog
// onDialogHide   - Function to be used as handler for @hide on QDialog
// onDialogOK     - Function to call to settle dialog with "ok" outcome
//                    example: onDialogOK() - no payload
//                    example: onDialogOK({ /*...*/ }) - with payload
// onDialogCancel - Function to call to settle dialog with "cancel" outcome

function handleGitHubOAuth() {
  // 参考 https://docs.netlify.com/security/secure-access-to-sites/oauth-provider-tokens/#site-usage-example
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  //@ts-ignore
  new netlify.default({
    // site_id: '7cf05e8d-66b1-45a3-a36b-dd415bff82b2',
  }).authenticate(
    { provider: 'github', scope: 'user' },
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore
    async function (error, data) {
      if (!isNil(error)) {
        $q.notify({
          color: 'negative',
          icon: 'error',
          position: 'top-right',
          message: `Failed to login with GitHub: ${error.message}`,
        });
      }
      oauthStore.updateToken(data.token);
      onDialogOK();
    }
  );
}
</script>

<style scoped></style>
