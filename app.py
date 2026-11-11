"""SERVER-1  -  profile, balance, login / account manage, match join, leaderboard   (DB1)"""
from common.appfactory import create_app
from modules import auth_mod, profile_mod, wallet_mod, match_mod, lb_mod, geo_mod, ref_mod

app = create_app("s1", "Server-1 (account / balance / match / leaderboard)",
                 [auth_mod, profile_mod, wallet_mod, match_mod, lb_mod, geo_mod, ref_mod], caps=("wallet",), dbs=("DB1",))
