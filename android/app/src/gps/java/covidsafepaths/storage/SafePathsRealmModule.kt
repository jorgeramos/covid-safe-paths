package covidsafepaths.storage

import covidsafepaths.storage.Location
import io.realm.annotations.RealmModule

@RealmModule(classes = [Location::class])
class SafePathsRealmModule