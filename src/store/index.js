import Vue from "vue";
import Vuex from "vuex";

// import example from './module-example'

Vue.use(Vuex);

/*
 * If not building with SSR mode, you can
 * directly export the Store instantiation;
 *
 * The function below can be async too; either use
 * async/await or return a Promise which resolves
 * with the Store instance.
 */

export default function(/* { ssrContext } */) {
  const Store = new Vuex.Store({
    state: { ipfs_id: {}, identities: {} },
    mutations: {
      setIpfsId(state, payload) {
        state.ipfs_id = payload;
      },
      setIdentity(state, identity) {
        state.identities[identity["publisher"]] = identity;
      },
      setIdentites(state, identities) {
        console.log("setIdentites");
        console.log(identities);
        state.identities = identities;
      }
    },
    // enable strict mode (adds overhead!)
    // for dev mode only
    strict: process.env.DEV
  });

  return Store;
}
