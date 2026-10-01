-- BNT-333 is a companion, not a player character. seed.sql never deletes, so remove it here.
delete from characters where id = 'bnt-333';
