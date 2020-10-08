<template>
  <div v-if="identity" class="identity-container">
    <br />
    <!-- avatar -->
    <img :src="identity.av" />
    <!-- display name -->
    <h6>
      {{ identity.dn }}
      <q-btn
        flat
        round
        color="primary"
        icon="edit"
        @click="editIdentityString(identity.dn)"
      />
    </h6>
    <!-- identity -->
    <h6>({{ identity.id }})</h6>
    <!-- time of last publication -->
    <div>Last update: {{ dt }}</div>
    <br />
    <!-- auxiliary fields -->
    <h6>Info:</h6>
    <div v-for="obj in identity.aux" :key="obj">placeholder</div>
    <br />
    <!-- following -->
    <h6>Following:</h6>
    <div v-for="iden in identity.following_deep" :key="iden">
      <router-link
        :identity="iden"
        :to="{ name: 'Identity', params: { identity: iden } }"
        >{{ iden.id }} - {{ iden.dn }}</router-link
      >
    </div>
    <br />
    <!-- meta  -->
    <h6>Collections:</h6>
    <div v-for="obj in identity.meta_deep" :key="obj">
      <router-link :to="{ name: 'Meta', params: { obj } }" :obj="obj">
        {{ obj }}
      </router-link>
    </div>
    <br />
    <!-- posts  -->
    <h6>Posts:</h6>
    <!-- <PostCard
      v-for="post in identity.posts_deep"
      :id="post.id"
      :key="post.ts"
      class="post-card"
      :post="post"
    ></PostCard>-->

    <!-- edit field modal -->
    <q-dialog v-model="editModal" persistent>
      <q-card style="min-width: 350px">
        <q-card-section>
          <div class="text-h6">Enter an ID to follow</div>
        </q-card-section>

        <q-card-section class="q-pt-none">
          <q-input
            v-model="editModal"
            dense
            autofocus
            @keyup.enter="editModal = false"
            @keyup.escape="editModal = false"
          />
        </q-card-section>

        <q-card-actions align="right" class="text-primary">
          <q-btn v-close-popup flat label="Cancel" />
          <q-btn
            v-close-popup
            flat
            label="Add ID"
            @click="addNewFollowing(editModal)"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
    <!-- end -->
  </div>
</template>

<script>
// import PostCard from "../components/PostCard.vue";
export default {
  name: "Identity",
  // components: { PostCard },
  props: {
    identity: {
      type: Object,
      required: true,
    },
  },
  data: function () {
    return {
      editModal: false,
      dt: "",
    };
  },
  watch: {
    "identity.posts_deep": {
      deep: true,
      async handler(event) {
        this.posts = event;
      },
    },
    "identity.meta_deep": {
      deep: true,
      async handler(event) {
        this.meta = event;
      },
    },
    "identity.following_deep": {
      deep: true,
      async handler(event) {
        this.following_deep = event;
      },
    },
  },
  mounted: async function () {
    console.log("IdentityObj.init()");
    console.log(this.identity);
    this.dt = new Date(Number(this.identity.ts));
  },
  methods: {
    editIdentityString(field, fieldName) {
      console.log(field);
      console.log(fieldName);
      this.editModal = true;
    },
  },
};
</script>

<style scoped></style>
