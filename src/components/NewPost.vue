<template>
  <q-card title="New post">
    <div class="q-pa-md">
      <div class="q-pa-md">
        <q-input
          v-model="body"
          autogrow
          filled
          label="What's happening?"
          type="textarea"
        />
      </div>

      <!-- file manager -->
      <div class="q-pa-md column items-start q-gutter-y-md">
        <q-file
          :value="files"
          :clearable="!isUploading"
          label="drag file(s) or click here"
          outlined
          multiple
          @input="updateFiles"
        >
          <template v-slot:file="{ index, file }">
            <q-chip
              class="full-width q-my-xs"
              :removable="isUploading && uploadProgress[index].percent < 1"
              square
              @remove="cancelFile(index)"
            >
              <q-linear-progress
                class="absolute-full full-height"
                :value="uploadProgress[index].percent"
                :color="uploadProgress[index].color"
                track-color="grey-2"
              />

              <q-avatar>
                <q-icon :name="uploadProgress[index].icon" />
              </q-avatar>

              <div class="ellipsis relative-position">
                {{ file.name }}
              </div>

              <q-tooltip>
                {{ file.name }}
              </q-tooltip>
            </q-chip>
          </template>

          <template v-slot:after>
            <q-btn
              color="primary"
              dense
              icon="cloud_upload"
              round
              @click="publish"
            />
          </template>
        </q-file>
      </div>
    </div>
  </q-card>
</template>
<script>
export default {
  name: "NewPost",
  components: {},
  props: {
    identity: {
      type: Object,
      required: true
    }
  },
  data: function() {
    return {
      body: "",
      files: [],
      uploadProgress: [],
      uploading: null
    };
  },
  computed: {
    isUploading() {
      return this.uploading !== null;
    },
    canUpload() {
      return this.files !== null;
    }
  },
  methods: {
    publish: async function() {
      await this.identity.addPost(this.files, this.body);
      this.body = "";
      this.files = [];
    },
    cancelFile(index) {
      this.uploadProgress[index] = {
        ...this.uploadProgress[index],
        error: true,
        color: "orange-2"
      };
    },

    updateFiles(files) {
      this.files = files;
      this.uploadProgress = (files || []).map(file => ({
        error: false,
        color: "green-2",
        percent: 0,
        icon:
          file.type.indexOf("video/") === 0
            ? "movie"
            : file.type.indexOf("image/") === 0
            ? "photo"
            : file.type.indexOf("audio/") === 0
            ? "audiotrack"
            : "insert_drive_file"
      }));
    }
  }
};
</script>
<style scoped>
.publish-button {
  float: right;
  float: bottom;
}
</style>
